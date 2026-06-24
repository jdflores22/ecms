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

    public PreAdviceService(IEcmsDbContext db, IAuditService auditService, INotificationService notifications)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<PreAdviceDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.PreAdvices
            .Include(p => p.Broker)
            .Include(p => p.ShippingLine)
            .Include(p => p.Container)
            .AsQueryable();

        if (role == RoleNames.Broker)
            query = query.Where(p => p.BrokerId == userId);
        else if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.ShippingLineId.HasValue)
                query = query.Where(p => p.ShippingLineId == user.ShippingLineId);
        }

        var items = await query.OrderByDescending(p => p.CreatedAt).ToListAsync(cancellationToken);
        return items.Select(MapToDto).ToList();
    }

    public async Task<PreAdviceDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var item = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        return item is null ? null : MapToDto(item);
    }

    public async Task<PreAdviceDto> CreateAsync(CreatePreAdviceRequest request, int brokerId, CancellationToken cancellationToken = default)
    {
        var referenceNo = await GenerateReferenceNoAsync(cancellationToken);
        var preAdvice = new PreAdvice
        {
            ReferenceNo = referenceNo,
            BrokerId = brokerId,
            ShippingLineId = request.ShippingLineId,
            ContainerId = request.ContainerId,
            Remarks = request.Remarks,
            Status = PreAdviceStatus.Draft
        };

        _db.Add(preAdvice);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(brokerId, "Create", "PreAdvice", referenceNo, cancellationToken);

        return await GetByIdAsync(preAdvice.Id, brokerId, RoleNames.Broker, cancellationToken)
            ?? throw new InvalidOperationException("Failed to create pre-advice.");
    }

    public async Task<PreAdviceDto?> UpdateAsync(int id, UpdatePreAdviceRequest request, int userId, string role, CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null || preAdvice.Status != PreAdviceStatus.Draft)
            return null;

        preAdvice.ShippingLineId = request.ShippingLineId;
        preAdvice.ContainerId = request.ContainerId;
        preAdvice.Remarks = request.Remarks;
        _db.Update(preAdvice);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "PreAdvice", preAdvice.ReferenceNo, cancellationToken);

        return MapToDto(preAdvice);
    }

    public async Task<bool> DeleteAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null || preAdvice.Status != PreAdviceStatus.Draft)
            return false;

        _db.Remove(preAdvice);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Delete", "PreAdvice", preAdvice.ReferenceNo, cancellationToken);
        return true;
    }

    public async Task<PreAdviceDto?> SubmitAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var preAdvice = await GetQueryable(id, userId, RoleNames.Broker).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null || preAdvice.Status != PreAdviceStatus.Draft)
            return null;

        preAdvice.Status = PreAdviceStatus.Submitted;
        _db.Update(preAdvice);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Submit", "PreAdvice", preAdvice.ReferenceNo, cancellationToken);

        var evaluatorIds = await NotificationService.EvaluatorIdsForShippingLineAsync(_db, preAdvice.ShippingLineId, cancellationToken);
        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);
        await _notifications.NotifyUsersAsync(
            evaluatorIds.Concat(adminIds),
            "New pre-advice submitted",
            $"{preAdvice.ReferenceNo} is ready for evaluation.",
            "PreAdvice",
            $"/evaluations/{preAdvice.Id}",
            userId,
            preAdvice.ReferenceNo,
            cancellationToken);

        return MapToDto(preAdvice);
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

        _db.Update(preAdvice);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Cancel", "PreAdvice", preAdvice.ReferenceNo, cancellationToken);

        var evaluatorIds = await NotificationService.EvaluatorIdsForShippingLineAsync(_db, preAdvice.ShippingLineId, cancellationToken);
        await _notifications.NotifyUsersAsync(
            evaluatorIds,
            "Pre-advice cancelled",
            $"{preAdvice.ReferenceNo} was cancelled by the broker.",
            "PreAdvice",
            $"/evaluations/{preAdvice.Id}",
            userId,
            preAdvice.ReferenceNo,
            cancellationToken);

        return MapToDto(preAdvice);
    }

    public async Task<PreAdviceLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
    {
        var lines = await _db.ShippingLines
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .Select(s => new ShippingLineLookupDto(s.Id, s.Name, s.Code))
            .ToListAsync(cancellationToken);

        var containers = await _db.Containers
            .OrderBy(c => c.ContainerNo)
            .Select(c => new ContainerLookupDto(c.Id, c.ContainerNo, c.Size, c.Type, c.ShippingLineId))
            .ToListAsync(cancellationToken);

        return new PreAdviceLookupsDto(lines, containers);
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
            .OrderBy(d => d.Category)
            .ThenByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        return documents.Select(MapDocumentToDto).ToList();
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
        if (role != RoleNames.Broker)
            throw new InvalidOperationException("Only brokers can upload container photos.");

        var preAdvice = await GetQueryable(preAdviceId, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null)
            return null;

        if (preAdvice.Status is not (PreAdviceStatus.Draft or PreAdviceStatus.Submitted))
            throw new InvalidOperationException("Photos can only be added to draft or submitted requests.");

        if (category == ContainerPhotoCategory.Damage)
        {
            if (string.IsNullOrWhiteSpace(comment))
                throw new InvalidOperationException("A damage description is required for damage photos.");
        }
        else if (!ContainerPhotoCatalog.IsStandardView(category))
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
        await _auditService.LogAsync(userId, "UploadContainerPhoto", "PreAdvice", $"{preAdvice.ReferenceNo}:{category}", cancellationToken);

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
        if (role != RoleNames.Broker)
            return false;

        var preAdvice = await GetQueryable(preAdviceId, userId, role).FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null)
            return false;

        if (preAdvice.Status is not (PreAdviceStatus.Draft or PreAdviceStatus.Submitted))
            return false;

        var document = await _db.PreAdviceDocuments
            .FirstOrDefaultAsync(d => d.Id == documentId && d.PreAdviceId == preAdviceId, cancellationToken);

        if (document is null)
            return false;

        _db.Remove(document);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "DeleteDocument", "PreAdvice", preAdvice.ReferenceNo, cancellationToken);

        return true;
    }

    private async Task<bool> CanAccessPreAdviceAsync(int preAdviceId, int userId, string role, CancellationToken cancellationToken)
    {
        var preAdvice = await _db.PreAdvices.FirstOrDefaultAsync(p => p.Id == preAdviceId, cancellationToken);
        if (preAdvice is null)
            return false;

        if (role == RoleNames.Broker)
            return preAdvice.BrokerId == userId;

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
            .Include(p => p.Broker)
            .Include(p => p.ShippingLine)
            .Include(p => p.Container)
            .Where(p => p.Id == id);

        if (role == RoleNames.Broker)
            query = query.Where(p => p.BrokerId == userId);
        else if (role == RoleNames.Trucker)
            query = query.Where(p => _db.Schedules.Any(s => s.PreAdviceId == p.Id && s.TruckerId == userId));

        return query;
    }

    private async Task<string> GenerateReferenceNoAsync(CancellationToken cancellationToken)
    {
        var year = PhilippinesTime.Year;
        var count = await _db.PreAdvices.CountAsync(p => p.CreatedAt.Year == year, cancellationToken);
        return $"PA-{year}-{(count + 1):D5}";
    }

    private static PreAdviceDto MapToDto(PreAdvice p) => new(
        p.Id, p.ReferenceNo, p.BrokerId, p.Broker.FullName ?? p.Broker.Username,
        p.ShippingLineId, p.ShippingLine.Name, p.ContainerId, p.Container.ContainerNo,
        p.Container.Size, p.Container.Type, p.Status, p.Remarks, p.CreatedAt);

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
