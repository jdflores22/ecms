using ECMS.Application;
using ECMS.Application.DTOs.ContainerInventory;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ContainerInventoryService : IContainerInventoryService
{
    public const int DwellLimitDays = 90;
    public const int WarningThresholdDays = 75;

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public ContainerInventoryService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<ContainerInventoryResponseDto> GetInventoryAsync(
        int userId,
        string role,
        int? depotId,
        int? shippingLineId,
        string? complianceStatus,
        string? yardStatus,
        CancellationToken cancellationToken = default)
    {
        var lineId = await ResolveShippingLineIdAsync(shippingLineId, userId, role, cancellationToken);
        var releasedDetails = await YardInventoryReleaseHelper.GetReleasedDetailsAsync(_db, lineId, cancellationToken);

        var schedules = await _db.Schedules
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Container)
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.ShippingLine)
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Trucker)
            .Include(s => s.Depot)
            .Include(s => s.Payment)
            .Where(s => s.Status == ScheduleStatus.Confirmed)
            .Where(s => s.PreAdvice.Status == PreAdviceStatus.Approved)
            .Where(s => s.PreAdvice.ShippingLineId == lineId)
            .Where(s => !depotId.HasValue || s.DepotId == depotId.Value)
            .ToListAsync(cancellationToken);

        var manualEntries = await _db.ManualYardInventoryEntries
            .Include(e => e.ContainerSize)
            .Include(e => e.ContainerType)
            .Include(e => e.Depot)
            .Include(e => e.ShippingLine)
            .Where(e => e.ShippingLineId == lineId)
            .Where(e => !depotId.HasValue || e.DepotId == depotId.Value)
            .ToListAsync(cancellationToken);

        var items = schedules
            .Select(s => MapScheduleItem(s, releasedDetails))
            .Concat(manualEntries.Select(e => MapManualItem(e, releasedDetails)))
            .Where(i => MatchesComplianceFilter(i.ComplianceStatus, complianceStatus))
            .Where(i => MatchesYardStatusFilter(i.YardStatus, yardStatus))
            .OrderByDescending(i => i.YardStatus == nameof(YardInventoryStatus.AtYard))
            .ThenBy(i => i.DepotName)
            .ThenByDescending(i => i.YardInDate)
            .ToList();

        var shippingLine = await _db.ShippingLines
            .AsNoTracking()
            .Where(s => s.Id == lineId)
            .Select(s => new { s.Id, s.Code, s.Name })
            .FirstAsync(cancellationToken);

        var summary = BuildSummary(
            items,
            await GetContractTeuAsync(lineId, cancellationToken),
            shippingLine.Id,
            shippingLine.Code,
            shippingLine.Name);

        return new ContainerInventoryResponseDto(summary, items);
    }

    public async Task<ManualYardInventoryEntryDto> CreateManualEntryAsync(
        CreateManualYardInventoryRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var lineId = await ResolveShippingLineIdAsync(request.ShippingLineId, userId, role, cancellationToken);
        var entry = await CreateManualEntryCoreAsync(request, lineId, userId, cancellationToken);
        await _auditService.LogAsync(userId, "Create", "ManualYardInventory", entry.ContainerNo, cancellationToken);
        return MapManualEntryDto(entry);
    }

    public async Task<BulkCreateManualYardInventoryResponse> BulkCreateManualEntriesAsync(
        BulkCreateManualYardInventoryRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<ManualYardInventoryBulkError>();
        var successCount = 0;

        for (var i = 0; i < request.Entries.Count; i++)
        {
            var line = i + 1;
            var item = request.Entries[i];
            try
            {
                var lineId = await ResolveShippingLineIdAsync(item.ShippingLineId, userId, role, cancellationToken);
                await CreateManualEntryCoreAsync(item, lineId, userId, cancellationToken);
                successCount++;
            }
            catch (InvalidOperationException ex)
            {
                errors.Add(new ManualYardInventoryBulkError(line, item.ContainerNo ?? string.Empty, ex.Message));
            }
        }

        if (successCount > 0)
            await _auditService.LogAsync(userId, "BulkCreate", "ManualYardInventory", $"{successCount} entries", cancellationToken);

        return new BulkCreateManualYardInventoryResponse(successCount, errors);
    }

    public async Task<bool> DeleteManualEntryAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entry = await _db.ManualYardInventoryEntries
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (entry is null)
            return false;

        if (entry.YardStatus == YardInventoryStatus.Released)
            throw new InvalidOperationException("Released inventory records cannot be deleted.");

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue || entry.ShippingLineId != user.ShippingLineId.Value)
                throw new InvalidOperationException("You cannot remove this inventory entry.");
        }

        _db.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Delete", "ManualYardInventory", entry.ContainerNo, cancellationToken);
        return true;
    }

    public async Task ApplyYardReleaseAsync(
        int shippingLineId,
        int depotId,
        string containerNoNormalized,
        int containerSizeId,
        int containerTypeId,
        int withdrawalRequestId,
        int withdrawalLineId,
        string withdrawalReferenceNo,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var normalized = containerNoNormalized.Trim().ToUpperInvariant();
        var releasedAt = PhilippinesTime.UtcNow;

        var manualEntries = await _db.ManualYardInventoryEntries
            .Where(e => e.ShippingLineId == shippingLineId
                && e.DepotId == depotId
                && e.ContainerNo == normalized
                && e.ContainerSizeId == containerSizeId
                && e.ContainerTypeId == containerTypeId
                && e.YardStatus == YardInventoryStatus.AtYard)
            .ToListAsync(cancellationToken);

        foreach (var entry in manualEntries)
        {
            entry.YardStatus = YardInventoryStatus.Released;
            entry.ReleasedAt = releasedAt;
            entry.ReleasedWithdrawalRequestId = withdrawalRequestId;
            entry.ReleasedWithdrawalLineId = withdrawalLineId;
        }

        if (manualEntries.Count > 0)
            await _db.SaveChangesAsync(cancellationToken);

        _auditService.QueueLog(
            userId,
            "YardRelease",
            "ContainerInventory",
            $"{normalized} ({withdrawalReferenceNo})");
    }

    private async Task<ManualYardInventoryEntry> CreateManualEntryCoreAsync(
        CreateManualYardInventoryRequest request,
        int shippingLineId,
        int userId,
        CancellationToken cancellationToken)
    {
        var containerNo = NormalizeContainerNo(request.ContainerNo);
        if (string.IsNullOrWhiteSpace(containerNo))
            throw new InvalidOperationException("Container number is required.");

        if (request.YardInDate > PhilippinesTime.Today)
            throw new InvalidOperationException("Yard-in date cannot be in the future.");

        var size = await _db.ContainerSizes
            .FirstOrDefaultAsync(s => s.Id == request.ContainerSizeId && s.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Container size not found.");

        var type = await _db.ContainerTypes
            .FirstOrDefaultAsync(t => t.Id == request.ContainerTypeId && t.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Container type not found.");

        var depot = await _db.Depots
            .FirstOrDefaultAsync(d => d.Id == request.DepotId && d.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Container yard not found.");

        var hasContract = await _db.ShippingLineDepotContracts.AnyAsync(
            c => c.ShippingLineId == shippingLineId && c.DepotId == request.DepotId && c.IsActive,
            cancellationToken);

        if (!hasContract)
            throw new InvalidOperationException($"No active CY contract for {depot.Name}.");

        if (await _db.ManualYardInventoryEntries.AnyAsync(
                e => e.ShippingLineId == shippingLineId
                    && e.ContainerNo == containerNo
                    && e.DepotId == request.DepotId
                    && e.YardStatus == YardInventoryStatus.AtYard,
                cancellationToken))
            throw new InvalidOperationException($"Container {containerNo} is already registered at {depot.Name}.");

        if (await IsInWorkflowInventoryAsync(shippingLineId, containerNo, request.DepotId, cancellationToken))
            throw new InvalidOperationException($"Container {containerNo} is already tracked via an approved return at {depot.Name}.");

        var entry = new ManualYardInventoryEntry
        {
            ContainerNo = containerNo,
            ContainerSizeId = size.Id,
            ContainerTypeId = type.Id,
            DepotId = depot.Id,
            ShippingLineId = shippingLineId,
            YardInDate = request.YardInDate,
            Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim(),
            CreatedByUserId = userId,
            YardStatus = YardInventoryStatus.AtYard,
        };

        _db.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        entry = await _db.ManualYardInventoryEntries
            .Include(e => e.ContainerSize)
            .Include(e => e.ContainerType)
            .Include(e => e.Depot)
            .FirstAsync(e => e.Id == entry.Id, cancellationToken);

        return entry;
    }

    private async Task<bool> IsInWorkflowInventoryAsync(
        int shippingLineId,
        string containerNo,
        int depotId,
        CancellationToken cancellationToken)
    {
        var releasedDetails = await YardInventoryReleaseHelper.GetReleasedDetailsAsync(_db, shippingLineId, cancellationToken);

        var schedules = await _db.Schedules
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Container)
            .Where(
                s => s.Status == ScheduleStatus.Confirmed
                     && s.PreAdvice.Status == PreAdviceStatus.Approved
                     && s.PreAdvice.ShippingLineId == shippingLineId
                     && s.DepotId == depotId
                     && s.PreAdvice.Container.ContainerNo == containerNo)
            .ToListAsync(cancellationToken);

        return schedules.Any(s => !releasedDetails.ContainsKey(YardInventoryReleaseHelper.BuildKey(
            s.DepotId,
            s.PreAdvice.ContainerNoNormalized,
            s.PreAdvice.ContainerSizeId,
            s.PreAdvice.ContainerTypeId)));
    }

    private static ContainerInventoryItemDto MapScheduleItem(
        Schedule schedule,
        IReadOnlyDictionary<string, ReleasedYardDetail> releasedDetails)
    {
        var key = YardInventoryReleaseHelper.BuildKey(
            schedule.DepotId,
            schedule.PreAdvice.ContainerNoNormalized,
            schedule.PreAdvice.ContainerSizeId,
            schedule.PreAdvice.ContainerTypeId);
        var released = releasedDetails.TryGetValue(key, out var release);
        var yardIn = ResolveYardInDate(schedule);
        var dwellDays = DwellDays(yardIn);
        var compliance = released ? "Released" : ResolveCompliance(dwellDays);

        return new ContainerInventoryItemDto(
            schedule.Id,
            null,
            schedule.PreAdviceId,
            schedule.PreAdvice.ReferenceNo,
            "Workflow",
            schedule.PreAdvice.Container.ContainerNo,
            schedule.PreAdvice.Container.Size,
            schedule.PreAdvice.Container.Type,
            schedule.PreAdvice.ShippingLine.Code,
            schedule.PreAdvice.ShippingLine.Name,
            schedule.PreAdvice.Trucker.FullName,
            schedule.DepotId,
            schedule.Depot.Name,
            yardIn,
            schedule.Time.ToString("HH:mm"),
            dwellDays,
            released ? 0 : Math.Max(0, DwellLimitDays - dwellDays),
            compliance,
            released ? nameof(YardInventoryStatus.Released) : nameof(YardInventoryStatus.AtYard),
            released ? release!.ReleasedAt.ToString("O") : null,
            released ? release!.ReferenceNo : null,
            released ? release!.WithdrawalRequestId : null,
            schedule.Status.ToString(),
            schedule.PreAdvice.Remarks);
    }

    private static ContainerInventoryItemDto MapManualItem(
        ManualYardInventoryEntry entry,
        IReadOnlyDictionary<string, ReleasedYardDetail> releasedDetails)
    {
        var key = YardInventoryReleaseHelper.BuildKey(
            entry.DepotId,
            entry.ContainerNo,
            entry.ContainerSizeId,
            entry.ContainerTypeId);

        var releasedFromLine = releasedDetails.TryGetValue(key, out var release);
        var isReleased = entry.YardStatus == YardInventoryStatus.Released || releasedFromLine;
        var yardIn = entry.YardInDate;
        var dwellDays = DwellDays(yardIn);
        var compliance = isReleased ? "Released" : ResolveCompliance(dwellDays);

        return new ContainerInventoryItemDto(
            null,
            entry.Id,
            null,
            "Manual entry",
            "Manual",
            entry.ContainerNo,
            entry.ContainerSize.Label,
            entry.ContainerType.Code,
            entry.ShippingLine.Code,
            entry.ShippingLine.Name,
            null,
            entry.DepotId,
            entry.Depot.Name,
            yardIn,
            null,
            dwellDays,
            isReleased ? 0 : Math.Max(0, DwellLimitDays - dwellDays),
            compliance,
            isReleased ? nameof(YardInventoryStatus.Released) : nameof(YardInventoryStatus.AtYard),
            isReleased ? (entry.ReleasedAt ?? release?.ReleasedAt)?.ToString("O") : null,
            isReleased ? release?.ReferenceNo : null,
            isReleased ? release?.WithdrawalRequestId ?? entry.ReleasedWithdrawalRequestId : null,
            null,
            entry.Remarks);
    }

    private static ManualYardInventoryEntryDto MapManualEntryDto(ManualYardInventoryEntry entry) =>
        new(
            entry.Id,
            entry.ContainerNo,
            entry.ContainerSize.Label,
            entry.ContainerType.Code,
            entry.DepotId,
            entry.Depot.Name,
            entry.YardInDate,
            entry.Remarks,
            entry.CreatedAt.ToString("O"));

    private static DateOnly ResolveYardInDate(Schedule schedule)
    {
        var returnDate = schedule.Date;
        if (schedule.Payment?.PaidAt is { } paidAt)
        {
            var paymentDate = PhilippinesTime.ToDateOnly(paidAt);
            return paymentDate > returnDate ? paymentDate : returnDate;
        }

        return returnDate > PhilippinesTime.Today ? PhilippinesTime.Today : returnDate;
    }

    private static int DwellDays(DateOnly yardIn) =>
        Math.Max(0, PhilippinesTime.Today.DayNumber - yardIn.DayNumber);

    private static string ResolveCompliance(int dwellDays)
    {
        if (dwellDays >= DwellLimitDays)
            return "Overstay";
        if (dwellDays >= WarningThresholdDays)
            return "ApproachingLimit";
        return "WithinLimit";
    }

    private static bool MatchesComplianceFilter(string status, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter))
            return true;

        return string.Equals(status, filter.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesYardStatusFilter(string status, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter))
            return true;

        return string.Equals(status, filter.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private static ContainerInventorySummaryDto BuildSummary(
        IReadOnlyList<ContainerInventoryItemDto> items,
        decimal contractTeu,
        int shippingLineId,
        string shippingLineCode,
        string shippingLineName)
    {
        var atYardItems = items.Where(i => i.YardStatus == nameof(YardInventoryStatus.AtYard)).ToList();

        var byDepot = items
            .GroupBy(i => new { i.DepotId, i.DepotName })
            .Select(g => new ContainerInventoryDepotSummaryDto(
                g.Key.DepotId,
                g.Key.DepotName,
                g.Count(i => i.YardStatus == nameof(YardInventoryStatus.AtYard)),
                g.Count(i => i.YardStatus == nameof(YardInventoryStatus.Released)),
                g.Count(i => i.YardStatus == nameof(YardInventoryStatus.AtYard)
                    && i.ComplianceStatus == "Overstay")))
            .Where(d => d.AtYardCount > 0 || d.ReleasedCount > 0)
            .OrderBy(d => d.DepotName)
            .ToList();

        var size20Count = atYardItems.Count(i => CyCapacityGroups.GetGroupKey(i.ContainerSize) == "20");
        var size40Count = atYardItems.Count(i => CyCapacityGroups.GetGroupKey(i.ContainerSize) == "40");
        var usedTeu = atYardItems.Sum(i => TeuCalculator.FromContainerSize(i.ContainerSize));

        return new ContainerInventorySummaryDto(
            shippingLineId,
            shippingLineCode,
            shippingLineName,
            atYardItems.Count,
            items.Count(i => i.YardStatus == nameof(YardInventoryStatus.Released)),
            atYardItems.Count(i => i.ComplianceStatus == "WithinLimit"),
            atYardItems.Count(i => i.ComplianceStatus == "ApproachingLimit"),
            atYardItems.Count(i => i.ComplianceStatus == "Overstay"),
            DwellLimitDays,
            WarningThresholdDays,
            size20Count,
            size40Count,
            usedTeu,
            contractTeu,
            byDepot);
    }

    private async Task<decimal> GetContractTeuAsync(int shippingLineId, CancellationToken cancellationToken)
        => await _db.ShippingLineDepotContracts
            .Where(c => c.ShippingLineId == shippingLineId && c.IsActive && c.Depot.IsActive)
            .SumAsync(c => c.ContractTeu, cancellationToken);

    private static string NormalizeContainerNo(string containerNo) => containerNo.Trim().ToUpperInvariant();

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
}
