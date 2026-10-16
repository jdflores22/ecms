using ECMS.Application;
using ECMS.Application.DTOs.ContainerInventory;
using ECMS.Application.DTOs.CyAllocation;
using ECMS.Application.DTOs.PreAdvice;
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
    private readonly LogicteckIcsFeedClient _logicteckFeeds;
    private readonly LogicteckFeedResolver _logicteckFeedResolver;
    private readonly IPreAdviceService _preAdviceService;

    public ContainerInventoryService(
        IEcmsDbContext db,
        IAuditService auditService,
        LogicteckIcsFeedClient logicteckFeeds,
        LogicteckFeedResolver logicteckFeedResolver,
        IPreAdviceService preAdviceService)
    {
        _db = db;
        _auditService = auditService;
        _logicteckFeeds = logicteckFeeds;
        _logicteckFeedResolver = logicteckFeedResolver;
        _preAdviceService = preAdviceService;
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
            .Include(s => s.QRBooking)
            .Where(s => s.Status == ScheduleStatus.Completed)
            .Where(s => s.QRBooking != null && s.QRBooking.GateCheckedInAt != null)
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
            .Select(s => new { s.Id, s.Code, s.Name, s.LogicteckFeedCode })
            .FirstAsync(cancellationToken);

        items = await MergeLogicteckInventoryForShippingLineAsync(
            items,
            lineId,
            shippingLine.Code,
            shippingLine.Name,
            shippingLine.LogicteckFeedCode,
            depotId,
            complianceStatus,
            yardStatus,
            cancellationToken);

        var contractedDepots = await _db.ShippingLineDepotContracts
            .AsNoTracking()
            .Where(c => c.ShippingLineId == lineId && c.IsActive && c.Depot.IsActive)
            .Where(c => !depotId.HasValue || c.DepotId == depotId.Value)
            .Select(c => new { c.DepotId, c.Depot.Name })
            .Distinct()
            .ToListAsync(cancellationToken);

        var summary = BuildSummary(
            items,
            await GetContractTeuAsync(lineId, cancellationToken),
            shippingLine.Id,
            shippingLine.Code,
            shippingLine.Name,
            contractedDepots.Select(d => (d.DepotId, d.Name)).ToList());

        return new ContainerInventoryResponseDto(summary, items);
    }

    public async Task<DepotContainerInventoryResponseDto> GetInventoryByDepotAsync(
        int userId,
        string role,
        int? depotId,
        int? shippingLineId,
        string? complianceStatus,
        string? yardStatus,
        CancellationToken cancellationToken = default)
    {
        var resolvedDepotId = await ResolveDepotIdAsync(depotId, userId, role, cancellationToken);

        var contractedLines = await _db.ShippingLineDepotContracts
            .AsNoTracking()
            .Where(c => c.DepotId == resolvedDepotId && c.IsActive && c.Depot.IsActive)
            .Select(c => new
            {
                c.ShippingLineId,
                c.ShippingLine.Code,
                c.ShippingLine.Name,
                c.ShippingLine.LogicteckFeedCode,
            })
            .Distinct()
            .ToListAsync(cancellationToken);

        var lineIds = contractedLines.Select(c => c.ShippingLineId).ToList();
        if (lineIds.Count == 0)
        {
            var depotName = await _db.Depots
                .Where(d => d.Id == resolvedDepotId)
                .Select(d => d.Name)
                .FirstAsync(cancellationToken);
            var emptySummary = BuildDepotSummary(Array.Empty<ContainerInventoryItemDto>(), 0, resolvedDepotId, depotName);
            return new DepotContainerInventoryResponseDto(emptySummary, Array.Empty<ContainerInventoryItemDto>());
        }

        if (shippingLineId.HasValue)
        {
            if (!lineIds.Contains(shippingLineId.Value))
                throw new InvalidOperationException("This shipping line has no active contract at your container yard.");
            lineIds = new List<int> { shippingLineId.Value };
        }

        var releasedDetails = await GetReleasedDetailsForLinesAsync(lineIds, cancellationToken);

        var schedules = await _db.Schedules
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Container)
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.ShippingLine)
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Trucker)
            .Include(s => s.Depot)
            .Include(s => s.Payment)
            .Include(s => s.QRBooking)
            .Where(s => s.Status == ScheduleStatus.Completed)
            .Where(s => s.QRBooking != null && s.QRBooking.GateCheckedInAt != null)
            .Where(s => s.PreAdvice.Status == PreAdviceStatus.Approved)
            .Where(s => s.DepotId == resolvedDepotId)
            .Where(s => lineIds.Contains(s.PreAdvice.ShippingLineId))
            .ToListAsync(cancellationToken);

        var manualEntries = await _db.ManualYardInventoryEntries
            .Include(e => e.ContainerSize)
            .Include(e => e.ContainerType)
            .Include(e => e.Depot)
            .Include(e => e.ShippingLine)
            .Where(e => e.DepotId == resolvedDepotId)
            .Where(e => lineIds.Contains(e.ShippingLineId))
            .ToListAsync(cancellationToken);

        var items = schedules
            .Select(s => MapScheduleItem(s, releasedDetails))
            .Concat(manualEntries.Select(e => MapManualItem(e, releasedDetails)))
            .Where(i => MatchesComplianceFilter(i.ComplianceStatus, complianceStatus))
            .Where(i => MatchesYardStatusFilter(i.YardStatus, yardStatus))
            .OrderByDescending(i => i.YardStatus == nameof(YardInventoryStatus.AtYard))
            .ThenBy(i => i.ShippingLineName)
            .ThenByDescending(i => i.YardInDate)
            .ToList();

        var depotEntity = await _db.Depots
            .AsNoTracking()
            .FirstAsync(d => d.Id == resolvedDepotId, cancellationToken);

        if (depotEntity.IsLogicteck)
        {
            items = await MergeLogicteckInventoryForDepotAsync(
                items,
                depotEntity,
                lineIds,
                contractedLines.Select(c => (c.ShippingLineId, c.Code, c.Name, c.LogicteckFeedCode)).ToList(),
                shippingLineId,
                complianceStatus,
                yardStatus,
                cancellationToken);
        }

        var contractTeu = await _db.ShippingLineDepotContracts
            .Where(c => c.DepotId == resolvedDepotId && c.IsActive && c.Depot.IsActive)
            .Where(c => !shippingLineId.HasValue || c.ShippingLineId == shippingLineId.Value)
            .SumAsync(c => c.ContractTeu, cancellationToken);

        var summary = BuildDepotSummary(items, contractTeu, depotEntity.Id, depotEntity.Name);

        return new DepotContainerInventoryResponseDto(summary, items);
    }

    public async Task<ManualYardInventoryEntryDto> CreateManualEntryAsync(
        CreateManualYardInventoryRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var lineId = await ResolveShippingLineIdAsync(request.ShippingLineId, userId, role, cancellationToken);
        await EnsureDepotPersonnelDepotAsync(request.DepotId, userId, role, cancellationToken);
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
                await EnsureDepotPersonnelDepotAsync(item.DepotId, userId, role, cancellationToken);
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
        else if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.DepotId.HasValue || entry.DepotId != user.DepotId.Value)
                throw new InvalidOperationException("You cannot remove this inventory entry.");
        }

        _db.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Delete", "ManualYardInventory", entry.ContainerNo, cancellationToken);
        return true;
    }

    public async Task<ContainerInventoryDetailDto?> GetInventoryDetailAsync(
        string source,
        int? scheduleId,
        int? manualEntryId,
        string? containerNo,
        int? depotId,
        int? shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var normalizedSource = source?.Trim() ?? string.Empty;
        if (string.Equals(normalizedSource, "Workflow", StringComparison.OrdinalIgnoreCase))
        {
            if (!scheduleId.HasValue)
                throw new InvalidOperationException("Schedule is required.");

            var schedule = await LoadScheduleForInventoryDetailAsync(scheduleId.Value, cancellationToken);
            if (schedule is null)
                return null;

            await EnsureCanViewInventoryScheduleAsync(schedule, userId, role, cancellationToken);
            var released = await YardInventoryReleaseHelper.GetReleasedDetailsAsync(
                _db,
                schedule.PreAdvice.ShippingLineId,
                cancellationToken);
            var item = MapScheduleItem(schedule, released);
            var photos = await _preAdviceService.GetDocumentsAsync(schedule.PreAdviceId, userId, role, cancellationToken);
            return new ContainerInventoryDetailDto(
                item,
                "ICS",
                "ICS",
                photos,
                Array.Empty<LogicteckContainerPhotoDto>(),
                Array.Empty<ContainerInventoryDetailFieldDto>());
        }

        if (string.Equals(normalizedSource, "Manual", StringComparison.OrdinalIgnoreCase))
        {
            if (!manualEntryId.HasValue)
                throw new InvalidOperationException("Manual entry is required.");

            var entry = await _db.ManualYardInventoryEntries
                .Include(e => e.ContainerSize)
                .Include(e => e.ContainerType)
                .Include(e => e.Depot)
                .Include(e => e.ShippingLine)
                .FirstOrDefaultAsync(e => e.Id == manualEntryId.Value, cancellationToken);
            if (entry is null)
                return null;

            await EnsureCanViewManualEntryAsync(entry, userId, role, cancellationToken);
            var released = await YardInventoryReleaseHelper.GetReleasedDetailsAsync(
                _db,
                entry.ShippingLineId,
                cancellationToken);
            var item = MapManualItem(entry, released);
            return new ContainerInventoryDetailDto(
                item,
                "ICS",
                "ICS",
                Array.Empty<PreAdviceDocumentDto>(),
                Array.Empty<LogicteckContainerPhotoDto>(),
                Array.Empty<ContainerInventoryDetailFieldDto>());
        }

        if (string.Equals(normalizedSource, "Logicteck", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(containerNo) || !depotId.HasValue)
                throw new InvalidOperationException("Container number and depot are required.");

            var lineId = await ResolveShippingLineIdAsync(shippingLineId, userId, role, cancellationToken);
            if (role == RoleNames.DepotPersonnel)
                await ResolveDepotIdAsync(depotId, userId, role, cancellationToken);

            var row = await FindLogicteckInventoryRowAsync(lineId, depotId.Value, containerNo, cancellationToken);
            if (row is null)
                return null;

            var depot = await _db.Depots.AsNoTracking().FirstAsync(d => d.Id == depotId.Value, cancellationToken);
            var line = await _db.ShippingLines.AsNoTracking().FirstAsync(s => s.Id == lineId, cancellationToken);
            var item = MapLogicteckInventoryRow(
                row,
                lineId,
                line.Code,
                line.Name,
                (depot.Id, depot.Name));
            var fields = BuildLogicteckDetailFields(row);
            var endpoints = _logicteckFeedResolver.ForDepot(depot);
            var logicteckPhotos = await _logicteckFeeds.TryGetContainerPhotosAsync(endpoints, row.Id, cancellationToken);

            return new ContainerInventoryDetailDto(
                item,
                "LOGICTECK",
                "LOGICTECK",
                Array.Empty<PreAdviceDocumentDto>(),
                logicteckPhotos,
                fields);
        }

        throw new InvalidOperationException("Invalid inventory source.");
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
            .Include(s => s.QRBooking)
            .Where(
                s => s.Status == ScheduleStatus.Completed
                     && s.QRBooking != null
                     && s.QRBooking.GateCheckedInAt != null
                     && s.PreAdvice.Status == PreAdviceStatus.Approved
                     && s.PreAdvice.ShippingLineId == shippingLineId
                     && s.DepotId == depotId
                     && s.PreAdvice.Container.ContainerNo == containerNo)
            .ToListAsync(cancellationToken);

        return schedules.Any(s =>
            YardInventoryWorkflowHelper.IsPhysicallyAtYard(s)
            && !releasedDetails.ContainsKey(YardInventoryReleaseHelper.BuildKey(
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
            schedule.PreAdvice.ShippingLineId,
            schedule.PreAdvice.ShippingLine.Code,
            schedule.PreAdvice.ShippingLine.Name,
            schedule.PreAdvice.Trucker.FullName,
            schedule.DepotId,
            schedule.Depot.Name,
            yardIn,
            ResolveGateInTime(schedule),
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
            entry.ShippingLineId,
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
        if (schedule.QRBooking?.GateCheckedInAt is { } gateCheckedInAt)
            return PhilippinesTime.ToDateOnly(gateCheckedInAt);

        var returnDate = schedule.Date;
        if (schedule.Payment?.PaidAt is { } paidAt)
        {
            var paymentDate = PhilippinesTime.ToDateOnly(paidAt);
            return paymentDate > returnDate ? paymentDate : returnDate;
        }

        return returnDate > PhilippinesTime.Today ? PhilippinesTime.Today : returnDate;
    }

    private static string? ResolveGateInTime(Schedule schedule)
    {
        if (schedule.QRBooking?.GateCheckedInAt is { } gateCheckedInAt)
        {
            var utc = gateCheckedInAt.Kind switch
            {
                DateTimeKind.Utc => gateCheckedInAt,
                DateTimeKind.Local => gateCheckedInAt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(gateCheckedInAt, DateTimeKind.Utc),
            };
            return TimeZoneInfo.ConvertTimeFromUtc(utc, PhilippinesTime.Zone).ToString("HH:mm");
        }

        return schedule.Time.ToString("HH:mm");
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
        string shippingLineName,
        IReadOnlyList<(int DepotId, string DepotName)>? contractedDepots = null)
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
            .ToList();

        if (contractedDepots is not null)
        {
            var known = byDepot.Select(d => d.DepotId).ToHashSet();
            foreach (var depot in contractedDepots)
            {
                if (known.Add(depot.DepotId))
                {
                    byDepot.Add(new ContainerInventoryDepotSummaryDto(depot.DepotId, depot.DepotName, 0, 0, 0));
                }
            }
        }

        byDepot = byDepot.OrderBy(d => d.DepotName).ToList();

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

    private static DepotContainerInventorySummaryDto BuildDepotSummary(
        IReadOnlyList<ContainerInventoryItemDto> items,
        decimal contractTeu,
        int depotId,
        string depotName)
    {
        var atYardItems = items.Where(i => i.YardStatus == nameof(YardInventoryStatus.AtYard)).ToList();

        var byShippingLine = items
            .GroupBy(i => new { i.ShippingLineId, i.ShippingLineCode, i.ShippingLineName })
            .Select(g => new ContainerInventoryShippingLineSummaryDto(
                g.Key.ShippingLineId,
                g.Key.ShippingLineCode,
                g.Key.ShippingLineName,
                g.Count(i => i.YardStatus == nameof(YardInventoryStatus.AtYard)),
                g.Count(i => i.YardStatus == nameof(YardInventoryStatus.Released)),
                g.Count(i => i.YardStatus == nameof(YardInventoryStatus.AtYard)
                    && i.ComplianceStatus == "Overstay")))
            .Where(d => d.AtYardCount > 0 || d.ReleasedCount > 0)
            .OrderBy(d => d.ShippingLineName)
            .ToList();

        var size20Count = atYardItems.Count(i => CyCapacityGroups.GetGroupKey(i.ContainerSize) == "20");
        var size40Count = atYardItems.Count(i => CyCapacityGroups.GetGroupKey(i.ContainerSize) == "40");
        var usedTeu = atYardItems.Sum(i => TeuCalculator.FromContainerSize(i.ContainerSize));

        return new DepotContainerInventorySummaryDto(
            depotId,
            depotName,
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
            byShippingLine);
    }

    private async Task<Dictionary<string, ReleasedYardDetail>> GetReleasedDetailsForLinesAsync(
        IReadOnlyList<int> shippingLineIds,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, ReleasedYardDetail>(StringComparer.OrdinalIgnoreCase);
        foreach (var lineId in shippingLineIds)
        {
            var details = await YardInventoryReleaseHelper.GetReleasedDetailsAsync(_db, lineId, cancellationToken);
            foreach (var pair in details)
                result[pair.Key] = pair.Value;
        }

        return result;
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

        if (role == RoleNames.DepotPersonnel)
        {
            if (!shippingLineId.HasValue)
                throw new InvalidOperationException("Shipping line is required.");

            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.DepotId.HasValue)
                throw new InvalidOperationException("Depot user is not assigned to a container yard.");

            var hasContract = await _db.ShippingLineDepotContracts.AnyAsync(
                c => c.ShippingLineId == shippingLineId.Value
                    && c.DepotId == user.DepotId.Value
                    && c.IsActive,
                cancellationToken);
            if (!hasContract)
                throw new InvalidOperationException("This shipping line has no active contract at your container yard.");

            return shippingLineId.Value;
        }

        if (!shippingLineId.HasValue)
            throw new InvalidOperationException("Shipping line is required.");

        return shippingLineId.Value;
    }

    private async Task<int> ResolveDepotIdAsync(
        int? depotId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.DepotId.HasValue)
                throw new InvalidOperationException("Depot user is not assigned to a container yard.");

            return user.DepotId.Value;
        }

        if (role == RoleNames.Administrator)
        {
            if (!depotId.HasValue)
                throw new InvalidOperationException("Depot is required.");

            return depotId.Value;
        }

        throw new UnauthorizedAccessException("Not allowed.");
    }

    private async Task<Schedule?> LoadScheduleForInventoryDetailAsync(int scheduleId, CancellationToken cancellationToken) =>
        await _db.Schedules
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Container)
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.ShippingLine)
            .Include(s => s.PreAdvice)
            .ThenInclude(p => p.Trucker)
            .Include(s => s.Depot)
            .Include(s => s.Payment)
            .Include(s => s.QRBooking)
            .FirstOrDefaultAsync(s => s.Id == scheduleId, cancellationToken);

    private async Task EnsureCanViewInventoryScheduleAsync(
        Schedule schedule,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == RoleNames.Administrator)
            return;

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue || schedule.PreAdvice.ShippingLineId != user.ShippingLineId.Value)
                throw new UnauthorizedAccessException();
            return;
        }

        if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.DepotId.HasValue || schedule.DepotId != user.DepotId.Value)
                throw new UnauthorizedAccessException();

            var hasContract = await _db.ShippingLineDepotContracts.AnyAsync(
                c => c.ShippingLineId == schedule.PreAdvice.ShippingLineId
                    && c.DepotId == schedule.DepotId
                    && c.IsActive,
                cancellationToken);
            if (!hasContract)
                throw new UnauthorizedAccessException();
            return;
        }

        throw new UnauthorizedAccessException();
    }

    private async Task EnsureCanViewManualEntryAsync(
        ManualYardInventoryEntry entry,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == RoleNames.Administrator)
            return;

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue || entry.ShippingLineId != user.ShippingLineId.Value)
                throw new UnauthorizedAccessException();
            return;
        }

        if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.DepotId.HasValue || entry.DepotId != user.DepotId.Value)
                throw new UnauthorizedAccessException();
            return;
        }

        throw new UnauthorizedAccessException();
    }

    private async Task<LogicteckInventoryRowDto?> FindLogicteckInventoryRowAsync(
        int shippingLineId,
        int depotId,
        string containerNo,
        CancellationToken cancellationToken)
    {
        var depot = await _db.Depots.AsNoTracking().FirstOrDefaultAsync(d => d.Id == depotId && d.IsLogicteck, cancellationToken);
        if (depot is null)
            return null;

        var line = await _db.ShippingLines.AsNoTracking().FirstAsync(s => s.Id == shippingLineId, cancellationToken);
        IReadOnlyList<LogicteckInventoryRowDto> feedRows;
        try
        {
            var endpoints = _logicteckFeedResolver.ForDepot(depot);
            feedRows = await _logicteckFeeds.GetAllInventoryAsync(endpoints, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return null;
        }

        var normalized = NormalizeContainerNo(containerNo);
        return feedRows.FirstOrDefault(row =>
            string.Equals(NormalizeContainerNo(row.ContainerNumber), normalized, StringComparison.OrdinalIgnoreCase)
            && (LineMatchesFeed(row.ShippingLine.Code, row.ShippingLine.FullName, line.Code, line.Name, line.LogicteckFeedCode)));
    }

    private static IReadOnlyList<ContainerInventoryDetailFieldDto> BuildLogicteckDetailFields(LogicteckInventoryRowDto row)
    {
        var fields = new List<ContainerInventoryDetailFieldDto>
        {
            new("LOGICTECK ID", row.Id),
            new("Feed status", row.Status),
            new("In yard", row.InYard ? "Yes" : "No"),
            new("TEU", row.Teu.ToString()),
        };

        AddField(fields, "Class", row.Class);
        AddField(fields, "EIR number", row.EirNumber);
        AddField(fields, "Condition", row.Condition);
        AddField(fields, "Cleanliness", row.Cleanliness);
        AddField(fields, "Trucking company", row.TruckingCompany);
        AddField(fields, "Plate number", row.PlateNumber);
        AddField(fields, "Booking ID", row.BookingId);
        if (row.Repair is not null)
            fields.Add(new ContainerInventoryDetailFieldDto("MNR complete", row.Repair.MnrComplete ? "Yes" : "No"));
        if (row.GateInAt.HasValue)
            fields.Add(new ContainerInventoryDetailFieldDto("Gate-in (LOGICTECK)", row.GateInAt.Value.ToString("O")));

        return fields;
    }

    private static void AddField(List<ContainerInventoryDetailFieldDto> fields, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
            fields.Add(new ContainerInventoryDetailFieldDto(label, value.Trim()));
    }

    private async Task EnsureDepotPersonnelDepotAsync(
        int depotId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role != RoleNames.DepotPersonnel)
            return;

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.DepotId.HasValue || user.DepotId.Value != depotId)
            throw new InvalidOperationException("You can only register inventory at your assigned container yard.");
    }

    private async Task<List<ContainerInventoryItemDto>> MergeLogicteckInventoryForShippingLineAsync(
        List<ContainerInventoryItemDto> items,
        int shippingLineId,
        string shippingLineCode,
        string shippingLineName,
        string? logicteckFeedCode,
        int? depotId,
        string? complianceStatus,
        string? yardStatus,
        CancellationToken cancellationToken)
    {
        var logicteckDepotIds = await _db.ShippingLineDepotContracts
            .AsNoTracking()
            .Where(c => c.ShippingLineId == shippingLineId && c.IsActive && c.Depot.IsActive && c.Depot.IsLogicteck)
            .Where(c => !depotId.HasValue || c.DepotId == depotId.Value)
            .Select(c => c.DepotId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (logicteckDepotIds.Count == 0)
            return items;

        if (depotId.HasValue && !logicteckDepotIds.Contains(depotId.Value))
            return items;

        var logicteckDepots = await _db.Depots
            .AsNoTracking()
            .Where(d => logicteckDepotIds.Contains(d.Id))
            .ToListAsync(cancellationToken);

        var logicteckDepotIdSet = logicteckDepots.Select(d => d.Id).ToHashSet();
        var withoutLogicteckYards = items.Where(i => !logicteckDepotIdSet.Contains(i.DepotId)).ToList();
        var mapped = new List<ContainerInventoryItemDto>();

        foreach (var ltDepot in logicteckDepots)
        {
            try
            {
                var endpoints = _logicteckFeedResolver.ForDepot(ltDepot);
                var feedRows = await _logicteckFeeds.GetAllInventoryAsync(endpoints, cancellationToken);
                mapped.AddRange(MapLogicteckInventoryRows(
                    feedRows,
                    shippingLineId,
                    shippingLineCode,
                    shippingLineName,
                    logicteckFeedCode,
                    new List<(int DepotId, string DepotName)> { (ltDepot.Id, ltDepot.Name) },
                    depotId));
            }
            catch (InvalidOperationException)
            {
                // Skip yard when URLs or API key are not configured.
            }
        }

        return withoutLogicteckYards
            .Concat(mapped)
            .Where(i => MatchesComplianceFilter(i.ComplianceStatus, complianceStatus))
            .Where(i => MatchesYardStatusFilter(i.YardStatus, yardStatus))
            .OrderByDescending(i => i.YardStatus == nameof(YardInventoryStatus.AtYard))
            .ThenBy(i => i.DepotName)
            .ThenByDescending(i => i.YardInDate)
            .ToList();
    }

    private async Task<List<ContainerInventoryItemDto>> MergeLogicteckInventoryForDepotAsync(
        List<ContainerInventoryItemDto> items,
        Depot logicteckDepot,
        IReadOnlyList<int> lineIds,
        IReadOnlyList<(int ShippingLineId, string Code, string Name, string? LogicteckFeedCode)> contractedLines,
        int? shippingLineId,
        string? complianceStatus,
        string? yardStatus,
        CancellationToken cancellationToken)
    {
        IReadOnlyList<LogicteckInventoryRowDto> feedRows;
        try
        {
            var endpoints = _logicteckFeedResolver.ForDepot(logicteckDepot);
            feedRows = await _logicteckFeeds.GetAllInventoryAsync(endpoints, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return items;
        }

        var lines = contractedLines
            .Where(l => lineIds.Contains(l.ShippingLineId))
            .Where(l => !shippingLineId.HasValue || l.ShippingLineId == shippingLineId.Value)
            .ToList();

        var mapped = new List<ContainerInventoryItemDto>();
        foreach (var line in lines)
        {
            mapped.AddRange(MapLogicteckInventoryRows(
                feedRows,
                line.ShippingLineId,
                line.Code,
                line.Name,
                line.LogicteckFeedCode,
                new List<(int DepotId, string DepotName)> { (logicteckDepot.Id, logicteckDepot.Name) },
                logicteckDepot.Id));
        }

        return mapped
            .Where(i => MatchesComplianceFilter(i.ComplianceStatus, complianceStatus))
            .Where(i => MatchesYardStatusFilter(i.YardStatus, yardStatus))
            .OrderByDescending(i => i.YardStatus == nameof(YardInventoryStatus.AtYard))
            .ThenBy(i => i.ShippingLineName)
            .ThenByDescending(i => i.YardInDate)
            .ToList();
    }

    private static List<ContainerInventoryItemDto> MapLogicteckInventoryRows(
        IReadOnlyList<LogicteckInventoryRowDto> rows,
        int shippingLineId,
        string shippingLineCode,
        string shippingLineName,
        string? logicteckFeedCode,
        IReadOnlyList<(int DepotId, string DepotName)> depots,
        int? depotIdFilter)
    {
        if (depots.Count == 0)
            return new List<ContainerInventoryItemDto>();

        var depot = depotIdFilter.HasValue
            ? depots.FirstOrDefault(d => d.DepotId == depotIdFilter.Value)
            : depots[0];
        if (depot == default)
            return new List<ContainerInventoryItemDto>();

        return rows
            .Where(row => LineMatchesFeed(row.ShippingLine.Code, row.ShippingLine.FullName, shippingLineCode, shippingLineName, logicteckFeedCode))
            .Select(row => MapLogicteckInventoryRow(row, shippingLineId, shippingLineCode, shippingLineName, depot))
            .ToList();
    }

    private static bool LineMatchesFeed(
        string? logicteckCode,
        string? logicteckFullName,
        string shippingLineCode,
        string shippingLineName,
        string? logicteckFeedCode) =>
        CodesMatch(logicteckCode, shippingLineCode)
        || CodesMatch(logicteckCode, shippingLineName)
        || CodesMatch(logicteckFullName, shippingLineName)
        || CodesMatch(logicteckCode, logicteckFeedCode)
        || CodesMatch(logicteckFullName, logicteckFeedCode);

    private static ContainerInventoryItemDto MapLogicteckInventoryRow(
        LogicteckInventoryRowDto row,
        int shippingLineId,
        string shippingLineCode,
        string shippingLineName,
        (int DepotId, string DepotName) depot)
    {
        var yardIn = row.GateInAt.HasValue
            ? PhilippinesTime.ToDateOnly(row.GateInAt.Value.UtcDateTime)
            : PhilippinesTime.Today;
        var dwellDays = DwellDays(yardIn);
        var atYard = row.InYard;
        var compliance = atYard ? ResolveCompliance(dwellDays) : "Released";
        var gateInTime = row.GateInAt.HasValue
            ? TimeZoneInfo.ConvertTimeFromUtc(row.GateInAt.Value.UtcDateTime, PhilippinesTime.Zone).ToString("HH:mm")
            : null;
        var remarks = string.Join(
            " · ",
            new[] { row.Condition, row.Cleanliness, row.Status }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

        return new ContainerInventoryItemDto(
            null,
            null,
            null,
            $"LOGICTECK · {row.Status}",
            "Logicteck",
            row.ContainerNumber,
            row.ContainerSize,
            NormalizeLogicteckType(row.ContainerType),
            shippingLineId,
            shippingLineCode,
            shippingLineName,
            row.TruckingCompany,
            depot.DepotId,
            depot.DepotName,
            yardIn,
            gateInTime,
            dwellDays,
            atYard ? Math.Max(0, DwellLimitDays - dwellDays) : 0,
            compliance,
            atYard ? nameof(YardInventoryStatus.AtYard) : nameof(YardInventoryStatus.Released),
            null,
            null,
            null,
            null,
            string.IsNullOrWhiteSpace(remarks) ? null : remarks);
    }

    private static string NormalizeLogicteckType(string containerType)
    {
        var upper = containerType.Trim().ToUpperInvariant();
        if (upper.Contains("HIGH CUBE", StringComparison.Ordinal))
            return "HC";
        if (upper.Contains("REEFER", StringComparison.Ordinal) || upper.StartsWith("RF", StringComparison.Ordinal))
            return "RF";
        if (upper.Contains("OPEN", StringComparison.Ordinal))
            return "OT";
        if (upper.StartsWith("GP", StringComparison.Ordinal) || upper.Contains("STANDARD", StringComparison.Ordinal))
            return "GP";
        return containerType.Trim();
    }

    private static bool CodesMatch(string? logicteckCode, string? localValue) =>
        !string.IsNullOrWhiteSpace(logicteckCode)
        && !string.IsNullOrWhiteSpace(localValue)
        && string.Equals(logicteckCode.Trim(), localValue.Trim(), StringComparison.OrdinalIgnoreCase);
}
