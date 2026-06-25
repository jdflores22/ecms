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
        CancellationToken cancellationToken = default)
    {
        var lineId = await ResolveShippingLineIdAsync(shippingLineId, userId, role, cancellationToken);

        var schedules = await _db.Schedules
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Container)
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
            .Where(e => e.ShippingLineId == lineId)
            .Where(e => !depotId.HasValue || e.DepotId == depotId.Value)
            .ToListAsync(cancellationToken);

        var items = schedules
            .Select(MapScheduleItem)
            .Concat(manualEntries.Select(MapManualItem))
            .Where(i => MatchesComplianceFilter(i.ComplianceStatus, complianceStatus))
            .OrderBy(i => i.DepotName)
            .ThenByDescending(i => i.YardInDate)
            .ToList();

        var summary = BuildSummary(items);

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
                e => e.ShippingLineId == shippingLineId && e.ContainerNo == containerNo && e.DepotId == request.DepotId,
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
        return await _db.Schedules
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Container)
            .AnyAsync(
                s => s.Status == ScheduleStatus.Confirmed
                     && s.PreAdvice.Status == PreAdviceStatus.Approved
                     && s.PreAdvice.ShippingLineId == shippingLineId
                     && s.DepotId == depotId
                     && s.PreAdvice.Container.ContainerNo == containerNo,
                cancellationToken);
    }

    private static ContainerInventoryItemDto MapScheduleItem(Schedule schedule)
    {
        var yardIn = ResolveYardInDate(schedule);
        var dwellDays = DwellDays(yardIn);
        var compliance = ResolveCompliance(dwellDays);

        return new ContainerInventoryItemDto(
            schedule.Id,
            null,
            schedule.PreAdviceId,
            schedule.PreAdvice.ReferenceNo,
            "Workflow",
            schedule.PreAdvice.Container.ContainerNo,
            schedule.PreAdvice.Container.Size,
            schedule.PreAdvice.Container.Type,
            schedule.DepotId,
            schedule.Depot.Name,
            yardIn,
            dwellDays,
            Math.Max(0, DwellLimitDays - dwellDays),
            compliance,
            schedule.Status.ToString());
    }

    private static ContainerInventoryItemDto MapManualItem(ManualYardInventoryEntry entry)
    {
        var dwellDays = DwellDays(entry.YardInDate);
        var compliance = ResolveCompliance(dwellDays);

        return new ContainerInventoryItemDto(
            null,
            entry.Id,
            null,
            "Manual entry",
            "Manual",
            entry.ContainerNo,
            entry.ContainerSize.Label,
            entry.ContainerType.Code,
            entry.DepotId,
            entry.Depot.Name,
            entry.YardInDate,
            dwellDays,
            Math.Max(0, DwellLimitDays - dwellDays),
            compliance,
            null);
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

    private static ContainerInventorySummaryDto BuildSummary(IReadOnlyList<ContainerInventoryItemDto> items)
    {
        var byDepot = items
            .GroupBy(i => new { i.DepotId, i.DepotName })
            .Select(g => new ContainerInventoryDepotSummaryDto(
                g.Key.DepotId,
                g.Key.DepotName,
                g.Count(),
                g.Count(i => i.ComplianceStatus == "Overstay")))
            .OrderBy(d => d.DepotName)
            .ToList();

        return new ContainerInventorySummaryDto(
            items.Count,
            items.Count(i => i.ComplianceStatus == "WithinLimit"),
            items.Count(i => i.ComplianceStatus == "ApproachingLimit"),
            items.Count(i => i.ComplianceStatus == "Overstay"),
            DwellLimitDays,
            WarningThresholdDays,
            byDepot);
    }

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
