using ECMS.Application;
using ECMS.Application.DTOs.CyAllocation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class CyAllocationService : ICyAllocationService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public CyAllocationService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<CyAllocationDto>> GetAllocationsAsync(
        int? shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var lineId = await ResolveShippingLineIdAsync(shippingLineId, userId, role, cancellationToken);
        return await BuildAllocationsAsync(lineId, null, cancellationToken);
    }

    public async Task<CyAllocationForApprovalDto?> GetForApprovalAsync(
        int preAdviceId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var preAdvice = await _db.PreAdvices
            .Include(p => p.Container)
            .FirstOrDefaultAsync(p => p.Id == preAdviceId, cancellationToken);

        if (preAdvice is null)
            return null;

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.ShippingLineId.HasValue && preAdvice.ShippingLineId != user.ShippingLineId)
                return null;
        }

        var requestedSizeKey = CyCapacityGroups.GetGroupKey(preAdvice.Container.Size);
        var allocations = await BuildAllocationsAsync(preAdvice.ShippingLineId, requestedSizeKey, cancellationToken);

        return new CyAllocationForApprovalDto(
            preAdvice.Id,
            preAdvice.ReferenceNo,
            preAdvice.Container.ContainerNo,
            preAdvice.Container.Size,
            allocations);
    }

    public async Task EnsureCapacityForApprovalAsync(
        int preAdviceId,
        int depotId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var context = await GetForApprovalAsync(preAdviceId, userId, role, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        var allocation = context.Allocations.FirstOrDefault(a => a.DepotId == depotId)
            ?? throw new InvalidOperationException("No contract allocation exists for this container yard and shipping line.");

        if (!allocation.HasCapacity)
        {
            var sizeLabel = CyCapacityGroups.GetGroupKey(context.ContainerSize);
            var sizeRow = allocation.Breakdown.FirstOrDefault(r =>
                CyCapacityGroups.GetGroupKey(r.SizeLabel) == sizeLabel);
            var available = sizeRow?.AvailableCount ?? 0;
            var contract = sizeRow?.ContractCount ?? 0;
            var displayLabel = CyCapacityGroups.GetDisplayLabel(sizeLabel);
            throw new InvalidOperationException(
                $"Insufficient capacity at {allocation.DepotName} for {displayLabel} containers. " +
                $"Available {available} of {contract} contract slots.");
        }
    }

    public async Task<CyAllocationDto> UpdateContractAsync(
        int contractId,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new InvalidOperationException("Only shipping line evaluators can update CY allocations from this page.");

        var contract = await _db.ShippingLineDepotContracts
            .FirstOrDefaultAsync(c => c.Id == contractId && c.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("CY contract not found.");

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.ShippingLineId.HasValue || user.ShippingLineId.Value != contract.ShippingLineId)
            throw new InvalidOperationException("You can only edit allocations for your assigned shipping line.");

        var snapshot = (await BuildAllocationsAsync(contract.ShippingLineId, null, cancellationToken))
            .FirstOrDefault(a => a.DepotId == contract.DepotId);
        if (snapshot is not null)
        {
            var usageByGroup = snapshot.Breakdown.ToDictionary(
                row => CyCapacityGroups.GetGroupKey(row.SizeLabel),
                row => row.PreAdvisedCount,
                StringComparer.OrdinalIgnoreCase);

            foreach (var input in request.Sizes.Where(s => s.ContractCount > 0))
            {
                var size = await _db.ContainerSizes.FirstAsync(s => s.Id == input.ContainerSizeId, cancellationToken);
                var groupKey = CyCapacityGroups.GetGroupKey(size.Label);
                var preAdvised = usageByGroup.GetValueOrDefault(groupKey);
                if (input.ContractCount < preAdvised)
                {
                    throw new InvalidOperationException(
                        $"Cannot set {CyCapacityGroups.GetDisplayLabel(groupKey)} limit below current pre-forecasted count ({preAdvised}).");
                }
            }
        }

        var updated = await ApplyContractUpdateAsync(contractId, request, userId, cancellationToken);
        var allocations = await BuildAllocationsAsync(contract.ShippingLineId, null, cancellationToken);
        return allocations.First(a => a.DepotId == updated.DepotId);
    }

    private async Task<ShippingLineDepotContract> ApplyContractUpdateAsync(
        int contractId,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken)
    {
        if (request.Sizes.Count == 0)
            throw new InvalidOperationException("At least one container size allocation is required.");

        var entity = await _db.ShippingLineDepotContracts
            .Include(c => c.SizeAllocations)
            .FirstOrDefaultAsync(c => c.Id == contractId, cancellationToken)
            ?? throw new InvalidOperationException("CY contract not found.");

        var catalog = await _db.ContainerSizes.Where(s => s.IsActive).ToListAsync(cancellationToken);
        var sizeInputs = CollapseSizeInputsByGroup(
            request.Sizes.Where(s => s.ContractCount > 0).ToList(),
            catalog);

        if (sizeInputs.Count == 0)
            throw new InvalidOperationException("At least one container size must have a contract count of 1 or more.");

        var sizes = await _db.ContainerSizes
            .Where(s => sizeInputs.Select(i => i.ContainerSizeId).Contains(s.Id) && s.IsActive)
            .ToListAsync(cancellationToken);

        if (sizes.Count != sizeInputs.Select(i => i.ContainerSizeId).Distinct().Count())
            throw new InvalidOperationException("One or more container sizes are invalid or inactive.");

        entity.IsActive = request.IsActive;
        entity.ContractTeu = (int)Math.Round(
            sizeInputs.Sum(input => input.ContractCount * sizes.First(s => s.Id == input.ContainerSizeId).Teu),
            MidpointRounding.AwayFromZero);
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
        return entity;
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

    private async Task<int> ResolveShippingLineIdAsync(
        int? shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue)
                throw new InvalidOperationException("Evaluator is not assigned to a shipping line.");

            return user.ShippingLineId.Value;
        }

        if (!shippingLineId.HasValue)
            throw new InvalidOperationException("Shipping line is required.");

        return shippingLineId.Value;
    }

    private async Task<IReadOnlyList<CyAllocationDto>> BuildAllocationsAsync(
        int shippingLineId,
        string? requestedSizeKey,
        CancellationToken cancellationToken)
    {
        var contracts = await _db.ShippingLineDepotContracts
            .Include(c => c.ShippingLine)
            .Include(c => c.Depot)
            .Include(c => c.SizeAllocations)
            .ThenInclude(s => s.ContainerSize)
            .Where(c => c.ShippingLineId == shippingLineId && c.IsActive && c.Depot.IsActive)
            .OrderBy(c => c.Depot.Name)
            .ToListAsync(cancellationToken);

        if (contracts.Count == 0)
            return Array.Empty<CyAllocationDto>();

        var depotIds = contracts.Select(c => c.DepotId).ToList();
        var teuByLabel = await GetTeuByLabelAsync(cancellationToken);
        var catalogSizes = await GetActiveSizesAsync(cancellationToken);
        var catalogTypes = await GetActiveTypesAsync(cancellationToken);
        var releasedDetails = await YardInventoryReleaseHelper.GetReleasedDetailsAsync(_db, shippingLineId, cancellationToken);
        var preAdvisedByDepot = await GetPreAdvisedUsageByDepotAsync(
            shippingLineId, depotIds, teuByLabel, releasedDetails, cancellationToken);
        var manualByDepot = await GetManualYardUsageByDepotAsync(
            shippingLineId, depotIds, teuByLabel, releasedDetails, cancellationToken);
        var bookingByDepot = await GetBookingUsageByDepotAsync(shippingLineId, depotIds, teuByLabel, cancellationToken);

        return contracts.Select(contract =>
        {
            var yardUsage = MergeDepotUsage(
                preAdvisedByDepot.GetValueOrDefault(contract.DepotId),
                manualByDepot.GetValueOrDefault(contract.DepotId));
            var booking = bookingByDepot.GetValueOrDefault(contract.DepotId);
            var breakdown = BuildBreakdown(contract, yardUsage, booking, catalogSizes, catalogTypes);

            var preAdvisedTeu = yardUsage?.UsedTeu ?? 0m;
            var bookingTeu = booking?.UsedTeu ?? 0m;
            var preAdvisedCount = yardUsage?.Count ?? 0;
            var bookingCount = booking?.Count ?? 0;
            var contractTeu = contract.ContractTeu;
            var availableTeu = Math.Max(0m, contractTeu - preAdvisedTeu);
            var contractCount = breakdown.Sum(r => r.ContractCount);
            var availableCount = breakdown.Sum(r => r.AvailableCount);
            var preAdvisedSlotCount = breakdown.Sum(r => r.PreAdvisedCount);

            var hasCapacity = requestedSizeKey is null
                ? breakdown.Any(row => row.AvailableCount > 0)
                : breakdown.Any(row =>
                    CyCapacityGroups.GetGroupKey(row.SizeLabel) == CyCapacityGroups.GetGroupKey(requestedSizeKey)
                    && row.AvailableCount > 0);

            return new CyAllocationDto(
                contract.Id,
                contract.DepotId,
                contract.Depot.Name,
                contract.Depot.Address,
                contract.ShippingLineId,
                contract.ShippingLine.Code,
                contract.ShippingLine.Name,
                contractTeu,
                contractCount,
                preAdvisedTeu,
                bookingTeu,
                availableTeu,
                availableCount,
                preAdvisedSlotCount,
                bookingCount,
                hasCapacity,
                breakdown);
        }).ToList();
    }

    private async Task<IReadOnlyList<ContainerSize>> GetActiveSizesAsync(CancellationToken cancellationToken)
        => await _db.ContainerSizes
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Label)
            .ToListAsync(cancellationToken);

    private async Task<IReadOnlyList<ContainerType>> GetActiveTypesAsync(CancellationToken cancellationToken)
        => await _db.ContainerTypes
            .Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Code)
            .ToListAsync(cancellationToken);

    private static IReadOnlyList<CyAllocationBreakdownRowDto> BuildBreakdown(
        ShippingLineDepotContract contract,
        DepotUsage? preAdvised,
        DepotUsage? booking,
        IReadOnlyList<ContainerSize> sizes,
        IReadOnlyList<ContainerType> types)
    {
        var contractByGroup = contract.SizeAllocations
            .GroupBy(a => CyCapacityGroups.GetGroupKey(a.ContainerSize.Label))
            .ToDictionary(g => g.Key, g => g.MaxBy(a => a.ContractCount)!.ContractCount);

        return sizes
            .Where(size => !CyCapacityGroups.IsSecondarySizeKey(TeuCalculator.NormalizeLabel(size.Label)))
            .Select(size =>
        {
            var sizeKey = TeuCalculator.NormalizeLabel(size.Label);
            var groupKey = CyCapacityGroups.GetGroupKey(sizeKey);
            contractByGroup.TryGetValue(groupKey, out var contractCount);

            var preAdvisedSizeCount = SumGroupCount(preAdvised, groupKey);
            var bookingSizeCount = SumGroupCount(booking, groupKey);
            var availableCount = Math.Max(0, contractCount - preAdvisedSizeCount);

            var cells = types.Select(type =>
            {
                var preCell = SumGroupCell(preAdvised, groupKey, type.Code);
                var bookCell = SumGroupCell(booking, groupKey, type.Code);
                return new CyAllocationBreakdownCellDto(
                    type.Code,
                    type.Label,
                    preCell.Count,
                    preCell.UsedTeu,
                    bookCell.Count,
                    bookCell.UsedTeu);
            }).ToList();

            return new CyAllocationBreakdownRowDto(
                CyCapacityGroups.GetDisplayLabel(groupKey),
                size.Teu,
                size.Id,
                contractCount,
                preAdvisedSizeCount,
                availableCount,
                bookingSizeCount,
                cells);
        }).ToList();
    }

    private static int SumGroupCount(DepotUsage? usage, string groupKey)
    {
        if (usage is null)
            return 0;

        return usage.Cells
            .Where(cell => CyCapacityGroups.GetGroupKey(cell.Key.SizeKey) == groupKey)
            .Sum(cell => cell.Value.Count);
    }

    private static (int Count, decimal UsedTeu) SumGroupCell(
        DepotUsage? usage,
        string groupKey,
        string typeCode)
    {
        if (usage is null)
            return (0, 0m);

        var matching = usage.Cells
            .Where(cell =>
                CyCapacityGroups.GetGroupKey(cell.Key.SizeKey) == groupKey
                && cell.Key.TypeCode == typeCode)
            .ToList();

        return (
            matching.Sum(cell => cell.Value.Count),
            matching.Sum(cell => cell.Value.UsedTeu));
    }

    private sealed class DepotUsage
    {
        public decimal UsedTeu { get; set; }
        public int Count { get; set; }
        public Dictionary<(string SizeKey, string TypeCode), (int Count, decimal UsedTeu)> Cells { get; } = new();
    }

    private async Task<Dictionary<string, decimal>> GetTeuByLabelAsync(CancellationToken cancellationToken)
    {
        var sizes = await _db.ContainerSizes.ToListAsync(cancellationToken);
        return sizes.ToDictionary(s => TeuCalculator.NormalizeLabel(s.Label), s => s.Teu);
    }

    private async Task<Dictionary<int, DepotUsage>> GetPreAdvisedUsageByDepotAsync(
        int shippingLineId,
        IReadOnlyList<int> depotIds,
        IReadOnlyDictionary<string, decimal> teuByLabel,
        IReadOnlyDictionary<string, ReleasedYardDetail> releasedDetails,
        CancellationToken cancellationToken)
    {
        var preAdvices = await _db.PreAdvices
            .Include(p => p.Container)
            .Include(p => p.Evaluation)
            .Include(p => p.Schedule)
            .Where(p => p.ShippingLineId == shippingLineId && p.Status == PreAdviceStatus.Approved)
            .Where(p =>
                (p.Evaluation != null && p.Evaluation.DepotId != null && depotIds.Contains(p.Evaluation.DepotId.Value))
                || (p.Schedule != null && depotIds.Contains(p.Schedule.DepotId)))
            .Where(p => p.Schedule == null
                || (p.Schedule.Status != ScheduleStatus.Completed && p.Schedule.Status != ScheduleStatus.NoShow))
            .ToListAsync(cancellationToken);

        var result = new Dictionary<int, DepotUsage>();
        foreach (var preAdvice in preAdvices)
        {
            var depotId = preAdvice.Schedule?.DepotId ?? preAdvice.Evaluation?.DepotId;
            if (!depotId.HasValue)
                continue;

            var releaseKey = YardInventoryReleaseHelper.BuildKey(
                depotId.Value,
                preAdvice.ContainerNoNormalized,
                preAdvice.ContainerSizeId,
                preAdvice.ContainerTypeId);
            if (releasedDetails.ContainsKey(releaseKey))
                continue;

            AddUsage(result, depotId.Value, preAdvice.Container.Size, preAdvice.Container.Type, teuByLabel);
        }

        return result;
    }

    private async Task<Dictionary<int, DepotUsage>> GetManualYardUsageByDepotAsync(
        int shippingLineId,
        IReadOnlyList<int> depotIds,
        IReadOnlyDictionary<string, decimal> teuByLabel,
        IReadOnlyDictionary<string, ReleasedYardDetail> releasedDetails,
        CancellationToken cancellationToken)
    {
        var entries = await _db.ManualYardInventoryEntries
            .Include(e => e.ContainerSize)
            .Include(e => e.ContainerType)
            .Where(e => e.ShippingLineId == shippingLineId && depotIds.Contains(e.DepotId))
            .Where(e => e.YardStatus == YardInventoryStatus.AtYard)
            .ToListAsync(cancellationToken);

        var result = new Dictionary<int, DepotUsage>();
        foreach (var entry in entries)
        {
            var releaseKey = YardInventoryReleaseHelper.BuildKey(
                entry.DepotId,
                entry.ContainerNo,
                entry.ContainerSizeId,
                entry.ContainerTypeId);
            if (releasedDetails.ContainsKey(releaseKey))
                continue;

            AddUsage(result, entry.DepotId, entry.ContainerSize.Label, entry.ContainerType.Code, teuByLabel);
        }

        return result;
    }

    private static DepotUsage? MergeDepotUsage(DepotUsage? primary, DepotUsage? secondary)
    {
        if (primary is null)
            return secondary;
        if (secondary is null)
            return primary;

        var merged = new DepotUsage
        {
            UsedTeu = primary.UsedTeu + secondary.UsedTeu,
            Count = primary.Count + secondary.Count,
        };

        foreach (var (key, value) in primary.Cells)
            merged.Cells[key] = value;

        foreach (var (key, value) in secondary.Cells)
        {
            if (merged.Cells.TryGetValue(key, out var existing))
                merged.Cells[key] = (existing.Count + value.Count, existing.UsedTeu + value.UsedTeu);
            else
                merged.Cells[key] = value;
        }

        return merged;
    }

    private Task<Dictionary<int, DepotUsage>> GetBookingUsageByDepotAsync(
        int shippingLineId,
        IReadOnlyList<int> depotIds,
        IReadOnlyDictionary<string, decimal> teuByLabel,
        CancellationToken cancellationToken)
        => Task.FromResult(new Dictionary<int, DepotUsage>());

    private static void AddUsage(
        Dictionary<int, DepotUsage> result,
        int depotId,
        string? containerSize,
        string containerType,
        IReadOnlyDictionary<string, decimal> teuByLabel)
    {
        var teu = TeuCalculator.FromContainerSize(containerSize, teuByLabel);
        var sizeKey = TeuCalculator.NormalizeLabel(containerSize ?? string.Empty);
        var typeCode = containerType.Trim().ToUpperInvariant();
        var cellKey = (sizeKey, typeCode);

        if (!result.TryGetValue(depotId, out var usage))
        {
            usage = new DepotUsage();
            result[depotId] = usage;
        }

        usage.UsedTeu += teu;
        usage.Count += 1;

        var currentCell = usage.Cells.GetValueOrDefault(cellKey, (Count: 0, UsedTeu: 0m));
        usage.Cells[cellKey] = (currentCell.Count + 1, currentCell.UsedTeu + teu);
    }
}
