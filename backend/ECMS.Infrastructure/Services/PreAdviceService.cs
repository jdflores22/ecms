using ECMS.Application;
using ECMS.Domain.Common;
using ECMS.Application.DTOs.PreAdvice;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class PreAdviceService : IPreAdviceService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;
    private readonly IDemurrageBillingService _demurrageBilling;

    public PreAdviceService(
        IEcmsDbContext db,
        IAuditService auditService,
        INotificationService notifications,
        IDemurrageBillingService demurrageBilling)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
        _demurrageBilling = demurrageBilling;
    }

    public async Task<IReadOnlyList<PreAdviceDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.PreAdvices
            .Include(p => p.Trucker)
            .Include(p => p.ShippingLine)
            .Include(p => p.Container)
            .Include(p => p.Evaluation)
            .Include(p => p.Schedule)
            .AsQueryable();

        if (RoleNames.IsPreAdviceManager(role))
            query = query.Where(p => p.TruckerId == userId);
        else if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.ShippingLineId.HasValue)
                query = query.Where(p => p.ShippingLineId == user.ShippingLineId);
        }

        var items = await query.OrderByDescending(p => p.CreatedAt).ToListAsync(cancellationToken);
        var damageIds = await LoadDamageReportIdsAsync(items.Select(p => p.Id).ToList(), cancellationToken);
        var qrByPreAdvice = await LoadQrInfoByPreAdviceIdsAsync(items.Select(p => p.Id).ToList(), cancellationToken);
        return items.Select(p => MapToDto(p, damageIds.Contains(p.Id), qrByPreAdvice.GetValueOrDefault(p.Id))).ToList();
    }

    public async Task<PreAdviceDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var item = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (item is null) return null;
        var damageIds = await LoadDamageReportIdsAsync(new[] { item.Id }, cancellationToken);
        var qrByPreAdvice = await LoadQrInfoByPreAdviceIdsAsync(new[] { item.Id }, cancellationToken);
        return MapToDto(item, damageIds.Contains(item.Id), qrByPreAdvice.GetValueOrDefault(item.Id));
    }

    private async Task<HashSet<int>> LoadDamageReportIdsAsync(
        IReadOnlyList<int> preAdviceIds,
        CancellationToken cancellationToken)
    {
        if (preAdviceIds.Count == 0)
            return new HashSet<int>();

        var ids = await _db.PreAdviceDocuments
            .AsNoTracking()
            .Where(d => preAdviceIds.Contains(d.PreAdviceId) && d.Category == ContainerPhotoCategory.Damage)
            .Select(d => d.PreAdviceId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return ids.ToHashSet();
    }

    private sealed record PreAdviceQrInfo(int QrBookingId, string QrCode, string LogicteckStatus);

    private async Task<Dictionary<int, PreAdviceQrInfo>> LoadQrInfoByPreAdviceIdsAsync(
        IReadOnlyList<int> preAdviceIds,
        CancellationToken cancellationToken)
    {
        if (preAdviceIds.Count == 0)
            return new Dictionary<int, PreAdviceQrInfo>();

        var rows = await _db.QRBookings
            .AsNoTracking()
            .Include(q => q.Schedule)
            .Where(q => preAdviceIds.Contains(q.Schedule.PreAdviceId))
            .Select(q => new
            {
                q.Id,
                q.QRCode,
                q.Schedule.PreAdviceId,
                q.IsUsed,
                q.LogicteckBookedAt,
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(
            r => r.PreAdviceId,
            r => new PreAdviceQrInfo(
                r.Id,
                r.QRCode,
                ResolveLogicteckStatus(r.IsUsed, r.LogicteckBookedAt)));
    }

    private static string ResolveLogicteckStatus(bool isUsed, DateTime? logicteckBookedAt)
    {
        if (isUsed) return "Retrieved";
        if (logicteckBookedAt.HasValue) return "Booked";
        return "Available";
    }

    private async Task<PreAdviceDto> MapToDtoAsync(PreAdvice p, CancellationToken cancellationToken)
    {
        var damageIds = await LoadDamageReportIdsAsync(new[] { p.Id }, cancellationToken);
        var qrByPreAdvice = await LoadQrInfoByPreAdviceIdsAsync(new[] { p.Id }, cancellationToken);
        return MapToDto(p, damageIds.Contains(p.Id), qrByPreAdvice.GetValueOrDefault(p.Id));
    }

    public async Task<PreAdviceDto> CreateAsync(CreatePreAdviceRequest request, int truckerId, CancellationToken cancellationToken = default)
    {
        var catalog = await ValidateCatalogAsync(
            request.ShippingLineId,
            request.ContainerNo,
            request.ContainerSizeId,
            request.ContainerTypeId,
            cancellationToken);

        await _demurrageBilling.EnsureTruckerCanCreatePreAdviceAsync(
            truckerId,
            catalog.NormalizedNo,
            request.ShippingLineId,
            request.ContainerSizeId,
            request.ContainerTypeId,
            cancellationToken);

        var container = await ResolveOrTrackContainerAsync(
            request.ShippingLineId,
            catalog.NormalizedNo,
            catalog.SizeLabel,
            catalog.TypeCode,
            cancellationToken);

        var referenceNo = await GenerateReferenceNoAsync(cancellationToken);
        var preAdvice = new PreAdvice
        {
            ReferenceNo = referenceNo,
            TruckerId = truckerId,
            ShippingLineId = request.ShippingLineId,
            Container = container,
            ContainerNoNormalized = catalog.NormalizedNo,
            ContainerSizeId = request.ContainerSizeId,
            ContainerTypeId = request.ContainerTypeId,
            Remarks = request.Remarks,
            Status = PreAdviceStatus.Draft,
        };
        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);

        _db.Add(preAdvice);
        _auditService.QueueLog(truckerId, "Create", "PreForecast", referenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var trucker = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == truckerId, cancellationToken);
        var shippingLine = await _db.ShippingLines.AsNoTracking().FirstAsync(s => s.Id == request.ShippingLineId, cancellationToken);
        preAdvice.Trucker = trucker;
        preAdvice.ShippingLine = shippingLine;

        return MapToDto(preAdvice, hasDamageReport: false);
    }

    public async Task<PreAdviceDto?> UpdateAsync(int id, UpdatePreAdviceRequest request, int userId, string role, CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null || preAdvice.Status is not (PreAdviceStatus.Draft or PreAdviceStatus.ForCompliance))
            return null;

        var catalog = await ValidateCatalogAsync(
            request.ShippingLineId,
            request.ContainerNo,
            request.ContainerSizeId,
            request.ContainerTypeId,
            cancellationToken);

        if (role == RoleNames.Trucker)
        {
            await _demurrageBilling.EnsureTruckerCanCreatePreAdviceAsync(
                userId,
                catalog.NormalizedNo,
                request.ShippingLineId,
                request.ContainerSizeId,
                request.ContainerTypeId,
                cancellationToken);
        }

        var containerId = await ResolveContainerIdAsync(
            request.ShippingLineId,
            catalog.NormalizedNo,
            catalog.SizeLabel,
            catalog.TypeCode,
            cancellationToken);

        preAdvice.ShippingLineId = request.ShippingLineId;
        preAdvice.ContainerId = containerId;
        preAdvice.ContainerNoNormalized = catalog.NormalizedNo;
        preAdvice.ContainerSizeId = request.ContainerSizeId;
        preAdvice.ContainerTypeId = request.ContainerTypeId;
        preAdvice.Remarks = request.Remarks;
        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);

        _db.Update(preAdvice);
        _auditService.QueueLog(userId, "Update", "PreForecast", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        return await MapToDtoAsync(preAdvice, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null || preAdvice.Status != PreAdviceStatus.Draft)
            return false;

        _db.Remove(preAdvice);
        _auditService.QueueLog(userId, "Delete", "PreForecast", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PreAdviceDto?> SubmitAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, RoleNames.Trucker).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null || preAdvice.Status is not (PreAdviceStatus.Draft or PreAdviceStatus.ForCompliance))
            return null;

        var wasCompliance = preAdvice.Status == PreAdviceStatus.ForCompliance;

        var uploadedStandard = await _db.PreAdviceDocuments
            .Where(d => d.PreAdviceId == id && d.Category != null)
            .Select(d => d.Category!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var missing = ContainerPhotoCatalog.StandardViews
            .Where(c => !uploadedStandard.Contains(c))
            .Select(ContainerPhotoCatalog.GetLabel)
            .ToList();

        if (missing.Count > 0)
            throw new InvalidOperationException(
                $"All container identity photos are required before submit. Missing: {string.Join(", ", missing)}.");

        await _demurrageBilling.EnsureTruckerCanCreatePreAdviceAsync(
            userId,
            preAdvice.ContainerNoNormalized,
            preAdvice.ShippingLineId,
            preAdvice.ContainerSizeId,
            preAdvice.ContainerTypeId,
            cancellationToken);

        await EnsureNoDuplicateAsync(
            preAdvice.ContainerNoNormalized,
            preAdvice.ContainerSizeId,
            preAdvice.ContainerTypeId,
            excludePreAdviceId: id,
            cancellationToken);

        preAdvice.Status = PreAdviceStatus.Submitted;
        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);
        _db.Update(preAdvice);
        _auditService.QueueLog(
            userId,
            wasCompliance ? "Resubmit" : "Submit",
            "PreForecast",
            preAdvice.ReferenceNo);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw DuplicateConflictException(await FindDuplicateAsync(
                preAdvice.ContainerNoNormalized,
                preAdvice.ContainerSizeId,
                preAdvice.ContainerTypeId,
                id,
                cancellationToken));
        }

        var evaluatorIds = await NotificationService.EvaluatorIdsForShippingLineAsync(_db, preAdvice.ShippingLineId, cancellationToken);
        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);
        await _notifications.NotifyUsersAsync(
            evaluatorIds.Concat(adminIds),
            wasCompliance ? "Pre-forecast resubmitted" : "New pre-forecast submitted",
            wasCompliance
                ? $"{preAdvice.ReferenceNo} was resubmitted after compliance corrections."
                : $"{preAdvice.ReferenceNo} is ready for evaluation.",
            "PreForecast",
            $"/evaluations/{preAdvice.Id}",
            userId,
            preAdvice.ReferenceNo,
            cancellationToken);

        return await MapToDtoAsync(preAdvice, cancellationToken);
    }

    public async Task<PreAdviceDto?> CancelAsync(
        int id,
        int userId,
        string role,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null)
            return null;

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Only submitted or under-evaluation requests can be cancelled.");

        preAdvice.Status = PreAdviceStatus.Cancelled;
        if (!string.IsNullOrWhiteSpace(reason))
            preAdvice.Remarks = reason.Trim();

        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);
        _db.Update(preAdvice);
        _auditService.QueueLog(userId, "Cancel", "PreForecast", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var evaluatorIds = await NotificationService.EvaluatorIdsForShippingLineAsync(_db, preAdvice.ShippingLineId, cancellationToken);
        await _notifications.NotifyUsersAsync(
            evaluatorIds,
            "Pre-forecast cancelled",
            $"{preAdvice.ReferenceNo} was cancelled by the trucker.",
            "PreForecast",
            $"/evaluations/{preAdvice.Id}",
            userId,
            preAdvice.ReferenceNo,
            cancellationToken);

        return await MapToDtoAsync(preAdvice, cancellationToken);
    }

    public async Task<PreAdviceLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        var lines = await _db.ShippingLines
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => new ShippingLineLookupDto(s.Id, s.Name, s.Code))
            .ToListAsync(cancellationToken);

        var sizes = await _db.ContainerSizes
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Label)
            .Select(s => new ContainerSizeLookupDto(s.Id, s.Label))
            .ToListAsync(cancellationToken);

        var types = await _db.ContainerTypes
            .Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Code)
            .Select(t => new ContainerTypeLookupDto(t.Id, t.Code, t.Label))
            .ToListAsync(cancellationToken);

        return new PreAdviceLookupsDto(lines, sizes, types);
    }

    public async Task<PreAdviceDuplicateCheckDto> CheckDuplicateAsync(
        CheckPreAdviceDuplicateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.ContainerSizeId <= 0
            || request.ContainerTypeId <= 0
            || string.IsNullOrWhiteSpace(request.ContainerNo))
        {
            return new PreAdviceDuplicateCheckDto(false, null, null, null);
        }

        if (!await _db.ContainerSizes.AnyAsync(s => s.Id == request.ContainerSizeId && s.IsActive, cancellationToken)
            || !await _db.ContainerTypes.AnyAsync(t => t.Id == request.ContainerTypeId && t.IsActive, cancellationToken))
        {
            return new PreAdviceDuplicateCheckDto(false, null, null, null);
        }

        var duplicate = await FindDuplicateAsync(
            PreAdviceDuplicateGuard.NormalizeContainerNo(request.ContainerNo),
            request.ContainerSizeId,
            request.ContainerTypeId,
            request.ExcludePreAdviceId,
            cancellationToken);

        return duplicate is null
            ? new PreAdviceDuplicateCheckDto(false, null, null, null)
            : new PreAdviceDuplicateCheckDto(true, duplicate.ReferenceNo, duplicate.Status, duplicate.TruckerName);
    }

    public async Task<IReadOnlyList<PreAdviceDocumentDto>> GetDocumentsAsync(
        int preAdviceId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!await CanAccessPreAdviceAsync(preAdviceId, userId, role, cancellationToken))
            return Array.Empty<PreAdviceDocumentDto>();

        var documents = await _db.PreAdviceDocuments
            .Include(d => d.UploadedBy)
            .Where(d => d.PreAdviceId == preAdviceId)
            .ToListAsync(cancellationToken);

        return documents
            .OrderBy(d => ContainerPhotoCatalog.GetDisplaySortOrder(d.Category))
            .ThenByDescending(d => d.CreatedAt)
            .Select(MapDocumentToDto)
            .ToList();
    }

    public async Task<PreAdviceDocumentDto?> UploadDocumentAsync(
        int preAdviceId,
        int userId,
        string role,
        ContainerPhotoCategory category,
        string? comment,
        string fileName,
        string filePath,
        string contentType,
        long fileSize,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsPreAdviceManager(role))
            throw new InvalidOperationException("Only truckers can upload container photos.");

        var preAdvice = await GetQueryable(preAdviceId, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null)
            return null;

        if (preAdvice.Status is not (PreAdviceStatus.Draft or PreAdviceStatus.Submitted or PreAdviceStatus.ForCompliance))
            throw new InvalidOperationException("Photos can only be added to draft, submitted, or for-compliance requests.");

        if (category == ContainerPhotoCategory.Damage)
        {
            if (string.IsNullOrWhiteSpace(comment))
                throw new InvalidOperationException("A damage description is required for damage photos.");
        }
        else if (!ContainerPhotoCatalog.IsIdentityGridSlot(category))
        {
            throw new InvalidOperationException("Invalid photo category.");
        }
        else
        {
            comment = null;
            var existing = await _db.PreAdviceDocuments
                .Where(d => d.PreAdviceId == preAdviceId && d.Category == category)
                .ToListAsync(cancellationToken);

            foreach (var doc in existing)
                _db.Remove(doc);
        }

        var document = new PreAdviceDocument
        {
            PreAdviceId = preAdviceId,
            Category = category,
            Comment = comment?.Trim(),
            FileName = fileName,
            FilePath = filePath,
            ContentType = contentType,
            FileSize = fileSize,
            UploadedById = userId,
        };

        _db.Add(document);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "UploadContainerPhoto", "PreForecast", $"{preAdvice.ReferenceNo}:{category}", cancellationToken);

        var saved = await _db.PreAdviceDocuments
            .Include(d => d.UploadedBy)
            .FirstAsync(d => d.Id == document.Id, cancellationToken);

        return MapDocumentToDto(saved);
    }

    public async Task<bool> DeleteDocumentAsync(
        int preAdviceId,
        int documentId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsPreAdviceManager(role))
            return false;

        var preAdvice = await GetQueryable(preAdviceId, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null)
            return false;

        if (preAdvice.Status is not (PreAdviceStatus.Draft or PreAdviceStatus.Submitted or PreAdviceStatus.ForCompliance))
            return false;

        var document = await _db.PreAdviceDocuments
            .FirstOrDefaultAsync(d => d.Id == documentId && d.PreAdviceId == preAdviceId, cancellationToken);

        if (document is null)
            return false;

        _db.Remove(document);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "DeleteDocument", "PreForecast", preAdvice.ReferenceNo, cancellationToken);

        return true;
    }

    private async Task<bool> CanAccessPreAdviceAsync(int preAdviceId, int userId, string role, CancellationToken cancellationToken)
    {
        var preAdvice = await _db.PreAdvices.FirstOrDefaultAsync(p => p.Id == preAdviceId, cancellationToken);
        if (preAdvice is null)
            return false;

        if (RoleNames.IsPreAdviceManager(role))
            return preAdvice.TruckerId == userId;

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            return !user.ShippingLineId.HasValue || preAdvice.ShippingLineId == user.ShippingLineId;
        }

        return true;
    }

    private IQueryable<PreAdvice> GetQueryable(int id, int userId, string role)
    {
        var query = _db.PreAdvices
            .Include(p => p.Trucker)
            .Include(p => p.ShippingLine)
            .Include(p => p.Container)
            .Include(p => p.Evaluation)
            .Where(p => p.Id == id);

        if (RoleNames.IsPreAdviceManager(role))
            query = query.Where(p => p.TruckerId == userId);

        return query;
    }

    private async Task<string> GenerateReferenceNoAsync(CancellationToken cancellationToken)
    {
        var year = PhilippinesTime.Year;
        var count = await _db.PreAdvices.CountAsync(p => p.CreatedAt.Year == year, cancellationToken);
        return $"PA-{year}-{(count + 1):D5}";
    }

    private async Task<Container> ResolveOrTrackContainerAsync(
        int shippingLineId,
        string normalizedNo,
        string sizeLabel,
        string typeCode,
        CancellationToken cancellationToken)
    {
        var container = await _db.Containers.FirstOrDefaultAsync(c => c.ContainerNo == normalizedNo, cancellationToken);
        if (container is not null)
        {
            if (container.ShippingLineId != shippingLineId)
                throw new InvalidOperationException($"Container {normalizedNo} is already registered under another shipping line.");

            container.Size = sizeLabel;
            container.Type = typeCode;
            _db.Update(container);
            return container;
        }

        container = new Container
        {
            ContainerNo = normalizedNo,
            Size = sizeLabel,
            Type = typeCode,
            ShippingLineId = shippingLineId,
        };
        _db.Add(container);
        return container;
    }

    private async Task<int> ResolveContainerIdAsync(
        int shippingLineId,
        string normalizedNo,
        string sizeLabel,
        string typeCode,
        CancellationToken cancellationToken)
    {
        var container = await _db.Containers.FirstOrDefaultAsync(c => c.ContainerNo == normalizedNo, cancellationToken);
        if (container is not null)
        {
            if (container.ShippingLineId != shippingLineId)
                throw new InvalidOperationException($"Container {normalizedNo} is already registered under another shipping line.");

            container.Size = sizeLabel;
            container.Type = typeCode;
            _db.Update(container);
            await _db.SaveChangesAsync(cancellationToken);
            return container.Id;
        }

        container = new Container
        {
            ContainerNo = normalizedNo,
            Size = sizeLabel,
            Type = typeCode,
            ShippingLineId = shippingLineId,
        };
        _db.Add(container);
        await _db.SaveChangesAsync(cancellationToken);
        return container.Id;
    }

    private sealed record CatalogSelection(string NormalizedNo, string SizeLabel, string TypeCode);

    private async Task<CatalogSelection> ValidateCatalogAsync(
        int shippingLineId,
        string containerNo,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken)
    {
        if (!await _db.ShippingLines.AnyAsync(s => s.Id == shippingLineId && s.IsActive, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        var size = await _db.ContainerSizes
            .FirstOrDefaultAsync(s => s.Id == containerSizeId && s.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Invalid container size.");

        var type = await _db.ContainerTypes
            .FirstOrDefaultAsync(t => t.Id == containerTypeId && t.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Invalid container type.");

        var normalizedNo = PreAdviceDuplicateGuard.NormalizeContainerNo(containerNo);
        if (string.IsNullOrWhiteSpace(normalizedNo))
            throw new InvalidOperationException("Container number is required.");

        return new CatalogSelection(normalizedNo, size.Label, type.Code);
    }

    private async Task EnsureNoDuplicateAsync(
        string normalizedNo,
        int containerSizeId,
        int containerTypeId,
        int? excludePreAdviceId,
        CancellationToken cancellationToken)
    {
        var duplicate = await FindDuplicateAsync(
            normalizedNo,
            containerSizeId,
            containerTypeId,
            excludePreAdviceId,
            cancellationToken);

        if (duplicate is not null)
            throw DuplicateConflictException(duplicate);
    }

    private async Task<DuplicateMatch?> FindDuplicateAsync(
        string normalizedNo,
        int containerSizeId,
        int containerTypeId,
        int? excludePreAdviceId,
        CancellationToken cancellationToken)
    {
        var key = PreAdviceDuplicateGuard.BuildKey(normalizedNo, containerSizeId, containerTypeId);

        return await _db.PreAdvices
            .AsNoTracking()
            .Where(p => p.ActiveRequestKey == key)
            .Where(p => excludePreAdviceId == null || p.Id != excludePreAdviceId.Value)
            .Select(p => new DuplicateMatch(
                p.ReferenceNo,
                p.Status,
                p.Trucker.FullName ?? p.Trucker.Username))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private sealed record DuplicateMatch(string ReferenceNo, PreAdviceStatus Status, string TruckerName);

    private static InvalidOperationException DuplicateConflictException(DuplicateMatch? duplicate)
    {
        if (duplicate is null)
            return new InvalidOperationException(
                "This container already has a submitted pre-forecast with the same number, size, and type.");

        return new InvalidOperationException(
            $"This container is already submitted ({duplicate.ReferenceNo}, {duplicate.Status}, trucker: {duplicate.TruckerName}). Wait for that request to finish or contact support.");
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException?.Message.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) == true
        || ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true
        || ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true;

    private static PreAdviceDto MapToDto(PreAdvice p, bool hasDamageReport, PreAdviceQrInfo? qrInfo = null) => new(
        p.Id, p.ReferenceNo, p.TruckerId, p.Trucker.FullName ?? p.Trucker.Username,
        p.ShippingLineId, p.ShippingLine.Name, p.ContainerId, p.Container.ContainerNo,
        p.Container.Size, p.Container.Type, p.Status,
        p.DemurrageValidUntil?.ToString("yyyy-MM-dd"),
        p.Remarks, p.CreatedAt,
        p.Status == PreAdviceStatus.ForCompliance ? p.Evaluation?.Remarks : null,
        p.Status == PreAdviceStatus.ForCompliance ? p.Evaluation?.EvaluatedAt : null,
        hasDamageReport,
        qrInfo is not null,
        qrInfo?.QrCode,
        qrInfo?.QrBookingId,
        qrInfo?.LogicteckStatus,
        p.Evaluation?.EvaluatedAt,
        p.Schedule?.Status.ToString());

    private static PreAdviceDocumentDto MapDocumentToDto(PreAdviceDocument d) => new(
        d.Id,
        d.PreAdviceId,
        d.Category?.ToString(),
        d.Category.HasValue ? ContainerPhotoCatalog.GetLabel(d.Category.Value) : null,
        d.Comment,
        d.FileName,
        d.FilePath,
        d.ContentType,
        d.FileSize,
        d.UploadedBy.FullName ?? d.UploadedBy.Username,
        d.CreatedAt);
}
