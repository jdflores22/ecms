using ECMS.Application;
using ECMS.Application.DTOs.CyAllocation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ShippingLineDepotContractService : IShippingLineDepotContractService
{
    private readonly IEcmsDbContext _db;
    private readonly ICyAllocationService _allocations;
    private readonly IAuditService _auditService;

    public ShippingLineDepotContractService(
        IEcmsDbContext db,
        ICyAllocationService allocations,
        IAuditService auditService)
    {
        _db = db;
        _allocations = allocations;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ShippingLineDepotContractDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var contracts = await _db.ShippingLineDepotContracts
            .Include(c => c.ShippingLine)
            .Include(c => c.Depot)
            .Include(c => c.SizeAllocations)
            .ThenInclude(s => s.ContainerSize)
            .OrderBy(c => c.ShippingLine.Name)
            .ThenBy(c => c.Depot.Name)
            .ToListAsync(cancellationToken);

        var result = new List<ShippingLineDepotContractDto>();
        foreach (var contract in contracts)
        {
            var allocations = await _allocations.GetAllocationsAsync(
                contract.ShippingLineId,
                0,
                RoleNames.Administrator,
                cancellationToken);
            var snapshot = allocations.FirstOrDefault(a => a.DepotId == contract.DepotId);
            result.Add(MapToDto(contract, snapshot));
        }

        return result;
    }

    public async Task<ShippingLineDepotContractDto> CreateAsync(
        CreateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var sizeInputs = await NormalizeSizeInputsAsync(request.Sizes, cancellationToken);

        if (!await _db.ShippingLines.AnyAsync(s => s.Id == request.ShippingLineId && s.IsActive, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        if (!await _db.Depots.AnyAsync(d => d.Id == request.DepotId && d.IsActive, cancellationToken))
            throw new InvalidOperationException("Container yard not found.");

        if (await _db.ShippingLineDepotContracts.AnyAsync(
                c => c.ShippingLineId == request.ShippingLineId && c.DepotId == request.DepotId,
                cancellationToken))
            throw new InvalidOperationException("A contract already exists for this shipping line and container yard.");

        var sizes = await LoadActiveSizesAsync(sizeInputs.Select(s => s.ContainerSizeId).ToList(), cancellationToken);
        var entity = new ShippingLineDepotContract
        {
            ShippingLineId = request.ShippingLineId,
            DepotId = request.DepotId,
            IsActive = true,
            ContractTeu = ComputeContractTeu(sizeInputs, sizes),
            SizeAllocations = sizeInputs.Select(input => new ShippingLineDepotContractSizeAllocation
            {
                ContainerSizeId = input.ContainerSizeId,
                ContractCount = input.ContractCount,
            }).ToList(),
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "ShippingLineDepotContract", $"{entity.ShippingLineId}:{entity.DepotId}", cancellationToken);

        var all = await GetAllAsync(cancellationToken);
        return all.First(c => c.Id == entity.Id);
    }

    public async Task<ShippingLineDepotContractDto?> UpdateAsync(
        int id,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var sizeInputs = await NormalizeSizeInputsAsync(request.Sizes, cancellationToken);

        var entity = await _db.ShippingLineDepotContracts
            .Include(c => c.SizeAllocations)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null)
            return null;

        var sizes = await LoadActiveSizesAsync(sizeInputs.Select(s => s.ContainerSizeId).ToList(), cancellationToken);

        entity.IsActive = request.IsActive;
        entity.ContractTeu = ComputeContractTeu(sizeInputs, sizes);
        entity.SizeAllocations.Clear();
        foreach (var input in sizeInputs)
        {
            entity.SizeAllocations.Add(new ShippingLineDepotContractSizeAllocation
            {
                ContainerSizeId = input.ContainerSizeId,
                ContractCount = input.ContractCount,
            });
        }

        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "ShippingLineDepotContract", entity.Id.ToString(), cancellationToken);

        var all = await GetAllAsync(cancellationToken);
        return all.FirstOrDefault(c => c.Id == id);
    }

    public async Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ShippingLineDepotContracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null || !entity.IsActive)
            return false;

        entity.IsActive = false;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Deactivate", "ShippingLineDepotContract", entity.Id.ToString(), cancellationToken);
        return true;
    }

    private static ShippingLineDepotContractDto MapToDto(
        ShippingLineDepotContract contract,
        CyAllocationDto? snapshot)
    {
        var usageByGroup = snapshot?.Breakdown.ToDictionary(
            row => CyCapacityGroups.GetGroupKey(row.SizeLabel),
            row => row,
            StringComparer.OrdinalIgnoreCase) ?? new Dictionary<string, CyAllocationBreakdownRowDto>();

        var sizes = contract.SizeAllocations
            .Where(a => !CyCapacityGroups.IsSecondarySizeKey(TeuCalculator.NormalizeLabel(a.ContainerSize.Label)))
            .OrderBy(s => s.ContainerSize.SortOrder)
            .ThenBy(s => s.ContainerSize.Label)
            .Select(allocation =>
            {
                var groupKey = CyCapacityGroups.GetGroupKey(allocation.ContainerSize.Label);
                usageByGroup.TryGetValue(groupKey, out var usageRow);
                var preAdvisedCount = usageRow?.PreAdvisedCount ?? 0;
                var contractCount = allocation.ContractCount;
                return new ShippingLineDepotContractSizeDto(
                    allocation.ContainerSizeId,
                    CyCapacityGroups.GetDisplayLabel(groupKey),
                    allocation.ContainerSize.Teu,
                    contractCount,
                    preAdvisedCount,
                    Math.Max(0, contractCount - preAdvisedCount));
            })
            .ToList();

        return new ShippingLineDepotContractDto(
            contract.Id,
            contract.ShippingLineId,
            contract.ShippingLine.Name,
            contract.DepotId,
            contract.Depot.Name,
            sizes,
            contract.IsActive);
    }

    private async Task<List<ContractSizeAllocationInput>> NormalizeSizeInputsAsync(
        IReadOnlyList<ContractSizeAllocationInput> sizes,
        CancellationToken cancellationToken)
    {
        if (sizes.Count == 0)
            throw new InvalidOperationException("At least one container size allocation is required.");

        var catalog = await _db.ContainerSizes
            .Where(s => s.IsActive)
            .ToListAsync(cancellationToken);

        var normalized = CollapseSizeInputsByGroup(
            sizes.Where(s => s.ContractCount > 0).ToList(),
            catalog);

        if (normalized.Count == 0)
            throw new InvalidOperationException("At least one container size must have a contract count of 1 or more.");

        if (normalized.Any(s => s.ContractCount < 1))
            throw new InvalidOperationException("Contract count must be at least 1 for each configured size.");

        return normalized;
    }

    private static List<ContractSizeAllocationInput> CollapseSizeInputsByGroup(
        IReadOnlyList<ContractSizeAllocationInput> sizes,
        IReadOnlyList<ContainerSize> catalog)
    {
        var sizeById = catalog.ToDictionary(s => s.Id);
        var primaryIdByGroup = catalog
            .Where(s => !CyCapacityGroups.IsSecondarySizeKey(TeuCalculator.NormalizeLabel(s.Label)))
            .GroupBy(s => CyCapacityGroups.GetGroupKey(s.Label))
            .ToDictionary(g => g.Key, g => g.OrderBy(s => s.SortOrder).ThenBy(s => s.Label).First().Id);

        var merged = new Dictionary<int, int>();
        foreach (var input in sizes)
        {
            if (!sizeById.TryGetValue(input.ContainerSizeId, out var size))
                throw new InvalidOperationException("One or more container sizes are invalid or inactive.");

            var groupKey = CyCapacityGroups.GetGroupKey(size.Label);
            var primaryId = primaryIdByGroup.GetValueOrDefault(groupKey, input.ContainerSizeId);
            merged[primaryId] = Math.Max(merged.GetValueOrDefault(primaryId), input.ContractCount);
        }

        return merged
            .Select(pair => new ContractSizeAllocationInput(pair.Key, pair.Value))
            .ToList();
    }

    private async Task<IReadOnlyList<ContainerSize>> LoadActiveSizesAsync(
        IReadOnlyList<int> sizeIds,
        CancellationToken cancellationToken)
    {
        var sizes = await _db.ContainerSizes
            .Where(s => sizeIds.Contains(s.Id) && s.IsActive)
            .ToListAsync(cancellationToken);

        if (sizes.Count != sizeIds.Distinct().Count())
            throw new InvalidOperationException("One or more container sizes are invalid or inactive.");

        return sizes;
    }

    private static int ComputeContractTeu(
        IReadOnlyList<ContractSizeAllocationInput> sizeInputs,
        IReadOnlyList<ContainerSize> sizes)
    {
        var teuById = sizes.ToDictionary(s => s.Id, s => s.Teu);
        return (int)Math.Round(
            sizeInputs.Sum(input => input.ContractCount * teuById[input.ContainerSizeId]),
            MidpointRounding.AwayFromZero);
    }
}
