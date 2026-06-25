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

    public CyAllocationService(IEcmsDbContext db)
    {
        _db = db;
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

        var requestedTeu = await ResolveTeuAsync(preAdvice.Container.Size, cancellationToken);
        var allocations = await BuildAllocationsAsync(preAdvice.ShippingLineId, requestedTeu, cancellationToken);

        return new CyAllocationForApprovalDto(
            preAdvice.Id,
            preAdvice.ReferenceNo,
            requestedTeu,
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
            ?? throw new InvalidOperationException("Pre-advice not found.");

        var allocation = context.Allocations.FirstOrDefault(a => a.DepotId == depotId)
            ?? throw new InvalidOperationException("No contract allocation exists for this container yard and shipping line.");

        if (!allocation.HasCapacity)
        {
            throw new InvalidOperationException(
                $"Insufficient TEU capacity at {allocation.DepotName}. " +
                $"Requested {context.RequestedTeu:0.#} TEU; available {allocation.AvailableTeu:0.#} of {allocation.ContractTeu} TEU contract.");
        }
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
        decimal? requestedTeu,
        CancellationToken cancellationToken)
    {
        var contracts = await _db.ShippingLineDepotContracts
            .Include(c => c.ShippingLine)
            .Include(c => c.Depot)
            .Where(c => c.ShippingLineId == shippingLineId && c.IsActive && c.Depot.IsActive)
            .OrderBy(c => c.Depot.Name)
            .ToListAsync(cancellationToken);

        if (contracts.Count == 0)
            return Array.Empty<CyAllocationDto>();

        var depotIds = contracts.Select(c => c.DepotId).ToList();
        var teuByLabel = await GetTeuByLabelAsync(cancellationToken);
        var catalogSizes = await GetActiveSizesAsync(cancellationToken);
        var catalogTypes = await GetActiveTypesAsync(cancellationToken);
        var usageByDepot = await GetUsageByDepotAsync(shippingLineId, depotIds, teuByLabel, cancellationToken);

        return contracts.Select(contract =>
        {
            var usage = usageByDepot.GetValueOrDefault(contract.DepotId);
            var used = usage?.UsedTeu ?? 0m;
            var activeReturns = usage?.ActiveReturns ?? 0;
            var available = Math.Max(0m, contract.ContractTeu - used);
            var breakdown = BuildBreakdown(usage, catalogSizes, catalogTypes);

            return new CyAllocationDto(
                contract.DepotId,
                contract.Depot.Name,
                contract.Depot.Address,
                contract.ShippingLineId,
                contract.ShippingLine.Name,
                contract.ContractTeu,
                used,
                available,
                activeReturns,
                requestedTeu.HasValue ? available >= requestedTeu.Value : available > 0,
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
        DepotUsage? usage,
        IReadOnlyList<ContainerSize> sizes,
        IReadOnlyList<ContainerType> types)
    {
        return sizes.Select(size =>
        {
            var sizeKey = TeuCalculator.NormalizeLabel(size.Label);
            var cells = types.Select(type =>
            {
                var cell = usage?.Cells.GetValueOrDefault((sizeKey, type.Code));
                return new CyAllocationBreakdownCellDto(
                    type.Code,
                    type.Label,
                    cell?.ReturnCount ?? 0,
                    cell?.UsedTeu ?? 0m);
            }).ToList();

            return new CyAllocationBreakdownRowDto(size.Label, size.Teu, cells);
        }).ToList();
    }

    private sealed class DepotUsage
    {
        public decimal UsedTeu { get; set; }
        public int ActiveReturns { get; set; }
        public Dictionary<(string SizeKey, string TypeCode), (int ReturnCount, decimal UsedTeu)> Cells { get; } = new();
    }

    private async Task<Dictionary<string, decimal>> GetTeuByLabelAsync(CancellationToken cancellationToken)
    {
        var sizes = await _db.ContainerSizes.ToListAsync(cancellationToken);
        return sizes.ToDictionary(s => TeuCalculator.NormalizeLabel(s.Label), s => s.Teu);
    }

    private async Task<decimal> ResolveTeuAsync(string? containerSize, CancellationToken cancellationToken)
    {
        var teuByLabel = await GetTeuByLabelAsync(cancellationToken);
        return TeuCalculator.FromContainerSize(containerSize, teuByLabel);
    }

    private async Task<Dictionary<int, DepotUsage>> GetUsageByDepotAsync(
        int shippingLineId,
        IReadOnlyList<int> depotIds,
        IReadOnlyDictionary<string, decimal> teuByLabel,
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
                || (p.Schedule.Status != ScheduleStatus.Completed && p.Schedule.Status != ScheduleStatus.Cancelled))
            .ToListAsync(cancellationToken);

        var result = new Dictionary<int, DepotUsage>();
        foreach (var preAdvice in preAdvices)
        {
            var depotId = preAdvice.Schedule?.DepotId ?? preAdvice.Evaluation?.DepotId;
            if (!depotId.HasValue)
                continue;

            var teu = TeuCalculator.FromContainerSize(preAdvice.Container.Size, teuByLabel);
            var sizeKey = TeuCalculator.NormalizeLabel(preAdvice.Container.Size);
            var typeCode = preAdvice.Container.Type.Trim().ToUpperInvariant();
            var cellKey = (sizeKey, typeCode);

            if (!result.TryGetValue(depotId.Value, out var usage))
            {
                usage = new DepotUsage();
                result[depotId.Value] = usage;
            }

            usage.UsedTeu += teu;
            usage.ActiveReturns += 1;

            var currentCell = usage.Cells.GetValueOrDefault(cellKey, (ReturnCount: 0, UsedTeu: 0m));
            usage.Cells[cellKey] = (currentCell.ReturnCount + 1, currentCell.UsedTeu + teu);
        }

        return result;
    }
}
