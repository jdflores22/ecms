using ECMS.Application.DTOs.ShippingLineCyFill;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ShippingLineCyFillService : IShippingLineCyFillService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public ShippingLineCyFillService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<ShippingLineCyFillSettingsDto> GetSettingsAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var line = await RequireShippingLineForUserAsync(userId, role, cancellationToken);
        return await BuildSettingsDtoAsync(line, cancellationToken);
    }

    public async Task<ShippingLineCyFillSettingsDto> UpdateStrategyAsync(
        UpdateCyFillStrategyRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var line = await RequireShippingLineForUserAsync(userId, role, cancellationToken);
        if (!Enum.TryParse<CyFillStrategy>(request.CyFillStrategy, true, out var strategy))
            throw new InvalidOperationException("Invalid CY fill strategy.");

        line.CyFillStrategy = strategy;
        _db.Update(line);
        await _auditService.LogAsync(userId, "Update", "ShippingLineCyFill", $"{line.Code} strategy → {strategy}", cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return await BuildSettingsDtoAsync(line, cancellationToken);
    }

    public async Task<ShippingLineCyFillSettingsDto> UpdatePrioritiesAsync(
        UpdateCyFillPrioritiesRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var line = await RequireShippingLineForUserAsync(userId, role, cancellationToken);
        var depotIds = request.DepotIdsInOrder.Distinct().ToList();
        if (depotIds.Count == 0)
            throw new InvalidOperationException("Select at least one container yard.");

        var contracted = await _db.ShippingLineDepotContracts
            .Where(c => c.ShippingLineId == line.Id && c.IsActive)
            .Select(c => c.DepotId)
            .ToListAsync(cancellationToken);

        foreach (var depotId in depotIds)
        {
            if (!contracted.Contains(depotId))
                throw new InvalidOperationException("Priority list may only include contracted container yards.");
        }

        var existing = await _db.ShippingLineDepotFillPriorities
            .Where(p => p.ShippingLineId == line.Id)
            .ToListAsync(cancellationToken);
        foreach (var row in existing)
            _db.Remove(row);

        for (var i = 0; i < depotIds.Count; i++)
        {
            _db.Add(new ShippingLineDepotFillPriority
            {
                ShippingLineId = line.Id,
                DepotId = depotIds[i],
                SortOrder = i + 1,
            });
        }

        await _auditService.LogAsync(userId, "Update", "ShippingLineCyFill", $"{line.Code} priority list ({depotIds.Count} CY)", cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return await BuildSettingsDtoAsync(line, cancellationToken);
    }

    public async Task<ShippingLineCyFillSettingsDto> SetDailyAssignmentAsync(
        SetDailyDepotFillRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var line = await RequireShippingLineForUserAsync(userId, role, cancellationToken);
        var hasContract = await _db.ShippingLineDepotContracts.AnyAsync(
            c => c.ShippingLineId == line.Id && c.DepotId == request.PrimaryDepotId && c.IsActive,
            cancellationToken);
        if (!hasContract)
            throw new InvalidOperationException("Selected container yard is not under contract for your shipping line.");

        var existing = await _db.ShippingLineDailyDepotFills
            .FirstOrDefaultAsync(
                d => d.ShippingLineId == line.Id && d.EffectiveDate == request.EffectiveDate,
                cancellationToken);

        if (existing is null)
        {
            _db.Add(new ShippingLineDailyDepotFill
            {
                ShippingLineId = line.Id,
                EffectiveDate = request.EffectiveDate,
                PrimaryDepotId = request.PrimaryDepotId,
                SetByUserId = userId,
            });
        }
        else
        {
            existing.PrimaryDepotId = request.PrimaryDepotId;
            existing.SetByUserId = userId;
            _db.Update(existing);
        }

        await _auditService.LogAsync(
            userId,
            "Update",
            "ShippingLineCyFill",
            $"{line.Code} daily CY {request.EffectiveDate:yyyy-MM-dd} → depot {request.PrimaryDepotId}",
            cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return await BuildSettingsDtoAsync(line, cancellationToken);
    }

    public async Task<RecommendedDepotOrderDto> GetRecommendedDepotOrderAsync(
        int shippingLineId,
        DateOnly effectiveDate,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue || user.ShippingLineId.Value != shippingLineId)
                throw new UnauthorizedAccessException("Not allowed for this shipping line.");
        }
        else if (role != RoleNames.Administrator)
        {
            throw new UnauthorizedAccessException("Not allowed.");
        }

        var line = await _db.ShippingLines.FirstAsync(s => s.Id == shippingLineId, cancellationToken);
        var depotIds = await BuildRecommendedDepotOrderAsync(line, effectiveDate, cancellationToken);
        return new RecommendedDepotOrderDto(
            shippingLineId,
            effectiveDate,
            line.CyFillStrategy.ToString(),
            depotIds);
    }

    public async Task<IReadOnlyList<int>> BuildRecommendedDepotOrderAsync(
        ShippingLine line,
        DateOnly effectiveDate,
        CancellationToken cancellationToken)
    {
        var contractedDepotIds = await _db.ShippingLineDepotContracts
            .Where(c => c.ShippingLineId == line.Id && c.IsActive)
            .Select(c => c.DepotId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (contractedDepotIds.Count == 0)
            return Array.Empty<int>();

        var ordered = new List<int>();

        if (line.CyFillStrategy == CyFillStrategy.DailyAssignment)
        {
            var daily = await _db.ShippingLineDailyDepotFills
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    d => d.ShippingLineId == line.Id && d.EffectiveDate == effectiveDate,
                    cancellationToken);
            if (daily is not null && contractedDepotIds.Contains(daily.PrimaryDepotId))
                ordered.Add(daily.PrimaryDepotId);
        }

        var priorities = await _db.ShippingLineDepotFillPriorities
            .AsNoTracking()
            .Include(p => p.Depot)
            .Where(p => p.ShippingLineId == line.Id && contractedDepotIds.Contains(p.DepotId))
            .OrderBy(p => p.SortOrder)
            .ToListAsync(cancellationToken);

        foreach (var priority in priorities)
        {
            if (!ordered.Contains(priority.DepotId))
                ordered.Add(priority.DepotId);
        }

        foreach (var depotId in contractedDepotIds.OrderBy(id => id))
        {
            if (!ordered.Contains(depotId))
                ordered.Add(depotId);
        }

        return ordered;
    }

    private async Task<ShippingLineCyFillSettingsDto> BuildSettingsDtoAsync(
        ShippingLine line,
        CancellationToken cancellationToken)
    {
        var today = PhilippinesTime.Today;
        var priorities = await _db.ShippingLineDepotFillPriorities
            .AsNoTracking()
            .Include(p => p.Depot)
            .Where(p => p.ShippingLineId == line.Id)
            .OrderBy(p => p.SortOrder)
            .Select(p => new ShippingLineDepotFillPriorityDto(p.DepotId, p.Depot.Name, p.SortOrder))
            .ToListAsync(cancellationToken);

        var daily = await _db.ShippingLineDailyDepotFills
            .AsNoTracking()
            .Include(d => d.PrimaryDepot)
            .Include(d => d.SetByUser)
            .FirstOrDefaultAsync(d => d.ShippingLineId == line.Id && d.EffectiveDate == today, cancellationToken);

        ShippingLineDailyDepotFillDto? dailyDto = daily is null
            ? null
            : new ShippingLineDailyDepotFillDto(
                daily.EffectiveDate,
                daily.PrimaryDepotId,
                daily.PrimaryDepot.Name,
                daily.CreatedAt,
                daily.SetByUser.FullName ?? daily.SetByUser.Username);

        return new ShippingLineCyFillSettingsDto(
            line.Id,
            line.Name,
            line.CyFillStrategy.ToString(),
            priorities,
            dailyDto);
    }

    private async Task<ShippingLine> RequireShippingLineForUserAsync(
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new UnauthorizedAccessException("Only shipping line users can manage CY fill settings.");

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.ShippingLineId.HasValue)
            throw new InvalidOperationException("User is not assigned to a shipping line.");

        return await _db.ShippingLines.FirstAsync(s => s.Id == user.ShippingLineId.Value, cancellationToken);
    }
}
