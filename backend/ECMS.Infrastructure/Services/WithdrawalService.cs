using ECMS.Application;
using ECMS.Application.DTOs.PreAdvice;
using ECMS.Application.DTOs.Withdrawal;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class WithdrawalService : IWithdrawalService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;

    public WithdrawalService(IEcmsDbContext db, IAuditService auditService, INotificationService notifications)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<WithdrawalDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = await ApplyRoleScopeAsync(BaseQuery(), userId, role, cancellationToken);
        var items = await query.OrderByDescending(w => w.CreatedAt).ToListAsync(cancellationToken);
        var docIds = await LoadAtwDocumentIdsAsync(items.Select(w => w.Id).ToList(), cancellationToken);
        return items.Select(w => MapToDto(w, docIds.Contains(w.Id))).ToList();
    }

    public async Task<int> GetPendingReviewCountAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.DepotPersonnel)
            return 0;

        var depotId = await GetUserDepotIdAsync(userId, cancellationToken);
        if (!depotId.HasValue)
            return 0;

        return await _db.WithdrawalRequests.CountAsync(
            w => w.CurrentDepotId == depotId.Value
                && (w.Status == WithdrawalStatus.Submitted || w.Status == WithdrawalStatus.UnderReview),
            cancellationToken);
    }

    public async Task<int> GetPendingActionCountAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.Trucker)
            return 0;

        return await _db.WithdrawalRequests.CountAsync(
            w => w.TruckerId == userId
                && (w.Status == WithdrawalStatus.Draft || w.Status == WithdrawalStatus.Issued),
            cancellationToken);
    }

    public async Task<WithdrawalDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var item = await FindScopedAsync(id, userId, role, cancellationToken);
        if (item is null) return null;
        var docIds = await LoadAtwDocumentIdsAsync(new[] { item.Id }, cancellationToken);
        return MapToDto(item, docIds.Contains(item.Id));
    }

    public async Task<WithdrawalLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default)
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

        var depots = await _db.Depots
            .OrderBy(d => d.Name)
            .Select(d => new DepotLookupDto(d.Id, d.Name))
            .ToListAsync(cancellationToken);

        return new WithdrawalLookupsDto(lines, sizes, types, depots);
    }

    public async Task<WithdrawalFormConfigDto> GetFormConfigAsync(CancellationToken cancellationToken = default)
    {
        var lookups = await GetLookupsAsync(cancellationToken);

        var contracts = await _db.ShippingLineDepotContracts
            .AsNoTracking()
            .Select(c => new { c.ShippingLineId, c.DepotId })
            .ToListAsync(cancellationToken);

        var contractDepots = contracts
            .GroupBy(c => c.ShippingLineId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<int>)g.Select(x => x.DepotId).Distinct().ToList());

        var rules = lookups.ShippingLines
            .Select(line => new ShippingLineWithdrawalRulesDto(
                line.Id,
                DefaultValidityDays: 14,
                MaxContainersPerBatch: 50,
                contractDepots.TryGetValue(line.Id, out var depotIds) ? depotIds : Array.Empty<int>()))
            .ToList();

        var destinations = lookups.Depots
            .Select(d => new DestinationLookupDto(d.Name, "CY"))
            .Concat(new[]
            {
                new DestinationLookupDto("Manila International Container Terminal (MICT)", "Port"),
                new DestinationLookupDto("Manila South Harbor", "Port"),
                new DestinationLookupDto("Subic Bay Freeport", "Port"),
                new DestinationLookupDto("Batangas Port", "Port"),
            })
            .DistinctBy(d => d.Label, StringComparer.OrdinalIgnoreCase)
            .OrderBy(d => d.Category)
            .ThenBy(d => d.Label)
            .ToList();

        return new WithdrawalFormConfigDto(
            lookups.ShippingLines,
            lookups.ContainerSizes,
            lookups.ContainerTypes,
            lookups.Depots,
            destinations,
            rules);
    }

    public async Task<WithdrawalAtwNumberCheckDto> CheckAtwNumberAsync(
        string atwNumber,
        int? excludeWithdrawalId,
        CancellationToken cancellationToken = default)
    {
        var normalized = atwNumber.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
            return new WithdrawalAtwNumberCheckDto(false, null, null);

        var query = _db.WithdrawalRequests.AsNoTracking()
            .Where(w => w.AtwNumber.ToUpper() == normalized);

        if (excludeWithdrawalId.HasValue)
            query = query.Where(w => w.Id != excludeWithdrawalId.Value);

        var existing = await query
            .Select(w => new { w.ReferenceNo, w.Status })
            .FirstOrDefaultAsync(cancellationToken);

        return existing is null
            ? new WithdrawalAtwNumberCheckDto(false, null, null)
            : new WithdrawalAtwNumberCheckDto(true, existing.ReferenceNo, existing.Status);
    }

    public async Task<WithdrawalYardCheckDto> CheckContainerInYardAsync(
        int depotId,
        string containerNo,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default)
    {
        var normalized = WithdrawalDuplicateGuard.NormalizeContainerNo(containerNo);
        if (depotId <= 0 || string.IsNullOrWhiteSpace(normalized))
            return new WithdrawalYardCheckDto(false, null, "Select a container yard and enter a container number.");

        var manual = await _db.ManualYardInventoryEntries.AsNoTracking()
            .AnyAsync(
                e => e.DepotId == depotId
                    && e.ContainerNo == normalized
                    && e.ContainerSizeId == containerSizeId
                    && e.ContainerTypeId == containerTypeId,
                cancellationToken);
        if (manual)
            return new WithdrawalYardCheckDto(true, "Manual yard inventory", null);

        var scheduled = await _db.Schedules.AsNoTracking()
            .AnyAsync(
                s => s.DepotId == depotId
                    && s.Status == ScheduleStatus.Confirmed
                    && s.PreAdvice.ContainerNoNormalized == normalized
                    && s.PreAdvice.ContainerSizeId == containerSizeId
                    && s.PreAdvice.ContainerTypeId == containerTypeId,
                cancellationToken);
        if (scheduled)
            return new WithdrawalYardCheckDto(true, "Confirmed return schedule", null);

        return new WithdrawalYardCheckDto(
            false,
            null,
            "Container not found in yard inventory at the selected CY. Verify the number, size, and type.");
    }

    public async Task<bool> DeleteDraftAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.WithdrawalRequests
            .Include(w => w.Lines)
            .Include(w => w.Documents)
            .FirstOrDefaultAsync(w => w.Id == id && w.TruckerId == userId, cancellationToken);

        if (entity is null) return false;
        if (entity.Status != WithdrawalStatus.Draft)
            throw new InvalidOperationException("Only draft withdrawal requests can be deleted.");

        foreach (var document in entity.Documents.ToList())
            _db.Remove(document);
        foreach (var line in entity.Lines.ToList())
            _db.Remove(line);
        _db.Remove(entity);
        _auditService.QueueLog(userId, "Delete", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<WithdrawalGatePassDto?> GetGatePassAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindScopedAsync(id, userId, role, cancellationToken);
        if (entity is null) return null;

        if (entity.Status is not (WithdrawalStatus.Approved or WithdrawalStatus.Released or WithdrawalStatus.Completed))
            return null;

        if (entity.ExpirationDate < PhilippinesTime.Today)
            return null;

        var gateCode = $"WDL-{entity.ReferenceNo}";
        var qrPayload = $"ECMS:WDL:{entity.Id}:{entity.ReferenceNo}:{entity.AtwNumber}";

        return new WithdrawalGatePassDto(
            gateCode,
            qrPayload,
            entity.ReferenceNo,
            entity.AtwNumber,
            BuildContainerSummary(entity.Lines.ToList()),
            entity.ExpirationDate.ToString("yyyy-MM-dd"),
            entity.CurrentDepot.Name,
            entity.Destination);
    }

    public async Task<EvaluatorAtwLookupsDto> GetEvaluatorLookupsAsync(int evaluatorId, CancellationToken cancellationToken = default)
    {
        var evaluator = await _db.Users
            .Include(u => u.ShippingLine)
            .FirstOrDefaultAsync(u => u.Id == evaluatorId, cancellationToken)
            ?? throw new InvalidOperationException("Evaluator not found.");

        if (!evaluator.ShippingLineId.HasValue || evaluator.ShippingLine is null)
            throw new InvalidOperationException("Your account is not linked to a shipping line.");

        var truckers = await _db.Users
            .Include(u => u.Role)
            .Where(u => u.Status == UserStatus.Active && u.Role.Name == RoleNames.Trucker)
            .OrderBy(u => u.FullName)
            .ThenBy(u => u.Username)
            .Select(u => new TruckerLookupDto(u.Id, u.FullName ?? u.Username, u.Username))
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

        var depots = await _db.Depots
            .OrderBy(d => d.Name)
            .Select(d => new DepotLookupDto(d.Id, d.Name))
            .ToListAsync(cancellationToken);

        var line = evaluator.ShippingLine;
        var nextAtwNumber = await GenerateNextAtwNumberAsync(line.Id, cancellationToken);
        return new EvaluatorAtwLookupsDto(
            new ShippingLineLookupDto(line.Id, line.Name, line.Code),
            nextAtwNumber,
            truckers,
            sizes,
            types,
            depots);
    }

    public async Task<WithdrawalDuplicateCheckDto> CheckDuplicateAsync(
        CheckWithdrawalDuplicateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.CurrentDepotId <= 0
            || request.ContainerSizeId <= 0
            || request.ContainerTypeId <= 0
            || string.IsNullOrWhiteSpace(request.ContainerNo))
        {
            return new WithdrawalDuplicateCheckDto(false, null, null, null);
        }

        var duplicate = await FindDuplicateAsync(
            request.CurrentDepotId,
            WithdrawalDuplicateGuard.NormalizeContainerNo(request.ContainerNo),
            request.ContainerSizeId,
            request.ContainerTypeId,
            request.ExcludeWithdrawalId,
            cancellationToken);

        return duplicate is null
            ? new WithdrawalDuplicateCheckDto(false, null, null, null)
            : new WithdrawalDuplicateCheckDto(true, duplicate.ReferenceNo, duplicate.Status, duplicate.TruckerName);
    }

    public async Task<WithdrawalDto> CreateAsync(CreateWithdrawalRequest request, int truckerId, CancellationToken cancellationToken = default)
    {
        var header = await ValidateHeaderAsync(
            request.AtwNumber,
            request.ShippingLineId,
            request.CurrentDepotId,
            request.Destination,
            request.IssueDate,
            request.ExpirationDate,
            request.Remarks,
            cancellationToken);

        var lineRows = await MaterializeLinesAsync(request.Lines, request.ShippingLineId, cancellationToken);
        var referenceNo = await GenerateReferenceNoAsync(cancellationToken);

        var entity = new WithdrawalRequest
        {
            ReferenceNo = referenceNo,
            AtwNumber = header.AtwNumber,
            TruckerId = truckerId,
            ShippingLineId = request.ShippingLineId,
            CurrentDepotId = request.CurrentDepotId,
            Destination = header.Destination,
            IssueDate = header.IssueDate,
            ExpirationDate = header.ExpirationDate,
            Purpose = WithdrawalPurpose.Repositioning,
            Status = WithdrawalStatus.Draft,
            Remarks = header.Remarks,
        };

        AttachLines(entity, lineRows);
        _db.Add(entity);
        _auditService.QueueLog(truckerId, "Create", "Withdrawal", referenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, truckerId, RoleNames.Trucker, cancellationToken))!;
    }

    public async Task<WithdrawalDto> IssueAtwAsync(IssueAtwRequest request, int evaluatorId, CancellationToken cancellationToken = default)
    {
        var evaluator = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == evaluatorId, cancellationToken)
            ?? throw new InvalidOperationException("Evaluator not found.");

        if (!evaluator.ShippingLineId.HasValue)
            throw new InvalidOperationException("Your account is not linked to a shipping line.");

        var trucker = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == request.AuthorizedTruckerId, cancellationToken)
            ?? throw new InvalidOperationException("Authorized trucker not found.");

        if (trucker.Role.Name != RoleNames.Trucker)
            throw new InvalidOperationException("Authorized user must be a trucker.");

        var header = await ValidateHeaderAsync(
            string.IsNullOrWhiteSpace(request.AtwNumber)
                ? await GenerateNextAtwNumberAsync(evaluator.ShippingLineId.Value, cancellationToken)
                : request.AtwNumber,
            evaluator.ShippingLineId.Value,
            request.CurrentDepotId,
            request.Destination,
            request.IssueDate,
            request.ExpirationDate,
            request.Remarks,
            cancellationToken);

        var lineRows = await MaterializeLinesAsync(request.Lines, evaluator.ShippingLineId.Value, cancellationToken);
        var referenceNo = await GenerateReferenceNoAsync(cancellationToken);
        var containerCount = lineRows.Count;

        var entity = new WithdrawalRequest
        {
            ReferenceNo = referenceNo,
            AtwNumber = header.AtwNumber,
            TruckerId = request.AuthorizedTruckerId,
            ShippingLineId = evaluator.ShippingLineId.Value,
            CurrentDepotId = request.CurrentDepotId,
            Destination = header.Destination,
            IssueDate = header.IssueDate,
            ExpirationDate = header.ExpirationDate,
            Purpose = WithdrawalPurpose.Repositioning,
            Status = WithdrawalStatus.Issued,
            Remarks = header.Remarks,
        };

        AttachLines(entity, lineRows);
        _db.Add(entity);
        _auditService.QueueLog(evaluatorId, "Issue", "Withdrawal", referenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var containerLabel = containerCount == 1 ? "1 container" : $"{containerCount} containers";
        await _notifications.NotifyUsersAsync(
            new[] { request.AuthorizedTruckerId },
            "ATW issued",
            $"{referenceNo} ({entity.AtwNumber}, {containerLabel}) — submit your withdrawal request with the ATW certificate.",
            "Withdrawal",
            $"/trucker/withdrawals/{entity.Id}",
            evaluatorId,
            referenceNo,
            cancellationToken);

        return (await GetByIdAsync(entity.Id, evaluatorId, RoleNames.ShippingLineEvaluator, cancellationToken))!;
    }

    public async Task<WithdrawalDto?> UpdateAsync(
        int id,
        UpdateWithdrawalRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindScopedAsync(id, userId, role, cancellationToken);
        if (entity is null) return null;

        if (entity.Status is not (WithdrawalStatus.Draft or WithdrawalStatus.Issued))
            throw new InvalidOperationException("Only draft or issued withdrawal requests can be edited.");

        if (role == RoleNames.Trucker && entity.Status == WithdrawalStatus.Issued)
            throw new InvalidOperationException("This withdrawal was issued by the shipping line and cannot be edited.");

        var header = await ValidateHeaderAsync(
            request.AtwNumber,
            request.ShippingLineId,
            request.CurrentDepotId,
            request.Destination,
            request.IssueDate,
            request.ExpirationDate,
            request.Remarks,
            cancellationToken);

        var lineRows = await MaterializeLinesAsync(request.Lines, request.ShippingLineId, cancellationToken);

        entity.AtwNumber = header.AtwNumber;
        entity.ShippingLineId = request.ShippingLineId;
        entity.CurrentDepotId = request.CurrentDepotId;
        entity.Destination = header.Destination;
        entity.IssueDate = header.IssueDate;
        entity.ExpirationDate = header.ExpirationDate;
        entity.Remarks = header.Remarks;

        await ReplaceLinesAsync(entity, lineRows, cancellationToken);
        _db.Update(entity);
        _auditService.QueueLog(userId, "Update", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<WithdrawalDto?> SubmitAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await FindScopedAsync(id, userId, RoleNames.Trucker, cancellationToken);
        if (entity is null) return null;

        if (entity.Status is not (WithdrawalStatus.Draft or WithdrawalStatus.Issued))
            throw new InvalidOperationException("Only draft or issued withdrawal requests can be submitted.");

        if (entity.Lines.Count == 0)
            throw new InvalidOperationException("Add at least one container before submitting.");

        if (entity.ExpirationDate < PhilippinesTime.Today)
            throw new InvalidOperationException("The ATW has expired. Update the expiration date before submitting.");

        var hasAtwDoc = await _db.WithdrawalDocuments
            .AnyAsync(
                d => d.WithdrawalRequestId == id && d.DocumentType == WithdrawalDocumentType.AtwCertificate,
                cancellationToken);
        if (!hasAtwDoc)
            throw new InvalidOperationException("Attach the ATW certificate before submitting.");

        foreach (var line in entity.Lines)
        {
            await EnsureNoDuplicateAsync(
                entity.CurrentDepotId,
                line.ContainerNoNormalized,
                line.ContainerSizeId,
                line.ContainerTypeId,
                excludeId: id,
                cancellationToken);
        }

        entity.Status = WithdrawalStatus.Submitted;
        entity.SubmittedAt = PhilippinesTime.UtcNow;
        foreach (var line in entity.Lines)
            line.LineStatus = WithdrawalLineStatus.Pending;
        WithdrawalDuplicateGuard.RefreshActiveKeys(entity);
        _db.Update(entity);
        _auditService.QueueLog(userId, "Submit", "Withdrawal", entity.ReferenceNo);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            throw new InvalidOperationException("A duplicate withdrawal request already exists for one or more containers in this batch.");
        }

        var containerLabel = entity.Lines.Count == 1 ? "1 container" : $"{entity.Lines.Count} containers";
        var depotIds = await NotificationService.DepotPersonnelIdsAsync(_db, entity.CurrentDepotId, cancellationToken);
        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);
        await _notifications.NotifyUsersAsync(
            depotIds.Concat(adminIds),
            "Withdrawal request submitted",
            $"{entity.ReferenceNo} ({entity.AtwNumber}, {containerLabel}) is awaiting CY validation.",
            "Withdrawal",
            $"/depot/withdrawals/{entity.Id}",
            userId,
            entity.ReferenceNo,
            cancellationToken);

        return await GetByIdAsync(id, userId, RoleNames.Trucker, cancellationToken);
    }

    public async Task<WithdrawalDto?> ApproveAsync(
        int id,
        int userId,
        string role,
        string? remarks,
        CancellationToken cancellationToken = default)
    {
        var entity = await RequireDepotReviewAsync(id, userId, role, cancellationToken);

        if (entity.Status is not (WithdrawalStatus.Submitted or WithdrawalStatus.UnderReview))
            throw new InvalidOperationException("Only submitted or under-review requests can be approved.");

        if (entity.ExpirationDate < PhilippinesTime.Today)
            throw new InvalidOperationException("The ATW has expired. Reject the request instead.");

        entity.Status = WithdrawalStatus.Approved;
        entity.ReviewRemarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim();
        foreach (var line in entity.Lines)
            line.LineStatus = WithdrawalLineStatus.Approved;
        WithdrawalDuplicateGuard.RefreshActiveKeys(entity);
        _db.Update(entity);
        _auditService.QueueLog(userId, "Approve", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var containerLabel = entity.Lines.Count == 1 ? "1 container" : $"{entity.Lines.Count} containers";
        await _notifications.NotifyUsersAsync(
            new[] { entity.TruckerId },
            "Withdrawal approved",
            $"{entity.ReferenceNo} ({containerLabel}) was approved by the container yard.",
            "Withdrawal",
            $"/trucker/withdrawals/{entity.Id}",
            userId,
            entity.ReferenceNo,
            cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<WithdrawalDto?> RejectAsync(
        int id,
        int userId,
        string role,
        string remarks,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(remarks))
            throw new InvalidOperationException("Rejection remarks are required.");

        var entity = await RequireDepotReviewAsync(id, userId, role, cancellationToken);

        if (entity.Status is not (WithdrawalStatus.Submitted or WithdrawalStatus.UnderReview))
            throw new InvalidOperationException("Only submitted or under-review requests can be rejected.");

        entity.Status = WithdrawalStatus.Rejected;
        entity.ReviewRemarks = remarks.Trim();
        foreach (var line in entity.Lines)
            line.LineStatus = WithdrawalLineStatus.Rejected;
        WithdrawalDuplicateGuard.ClearActiveKeys(entity);
        _db.Update(entity);
        _auditService.QueueLog(userId, "Reject", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var evaluatorIds = await NotificationService.EvaluatorIdsForShippingLineAsync(_db, entity.ShippingLineId, cancellationToken);
        await _notifications.NotifyUsersAsync(
            new[] { entity.TruckerId }.Concat(evaluatorIds),
            "Withdrawal rejected",
            $"{entity.ReferenceNo} was rejected: {entity.ReviewRemarks}",
            "Withdrawal",
            $"/trucker/withdrawals/{entity.Id}",
            userId,
            entity.ReferenceNo,
            cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<WithdrawalDto?> ReleaseAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var entity = await RequireDepotReviewAsync(id, userId, role, cancellationToken);

        if (entity.Status != WithdrawalStatus.Approved)
            throw new InvalidOperationException("Only approved requests can be marked as released.");

        entity.Status = WithdrawalStatus.Released;
        foreach (var line in entity.Lines)
            line.LineStatus = WithdrawalLineStatus.Released;
        WithdrawalDuplicateGuard.RefreshActiveKeys(entity);
        _db.Update(entity);
        _auditService.QueueLog(userId, "Release", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var containerLabel = entity.Lines.Count == 1 ? "1 container" : $"{entity.Lines.Count} containers";
        await _notifications.NotifyUsersAsync(
            new[] { entity.TruckerId },
            "Container released",
            $"{entity.ReferenceNo} ({containerLabel}) — release confirmed at the CY.",
            "Withdrawal",
            $"/trucker/withdrawals/{entity.Id}",
            userId,
            entity.ReferenceNo,
            cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<IReadOnlyList<WithdrawalDocumentDto>> GetDocumentsAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (await FindScopedAsync(id, userId, role, cancellationToken) is null)
            return Array.Empty<WithdrawalDocumentDto>();

        return await _db.WithdrawalDocuments
            .AsNoTracking()
            .Where(d => d.WithdrawalRequestId == id)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new WithdrawalDocumentDto(
                d.Id,
                d.WithdrawalRequestId,
                d.DocumentType,
                d.FileName,
                d.FilePath,
                d.ContentType,
                d.FileSize,
                d.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<WithdrawalDocumentDto> AddDocumentAsync(
        int id,
        int userId,
        string role,
        WithdrawalDocumentType documentType,
        string fileName,
        string filePath,
        string contentType,
        long fileSize,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindScopedAsync(id, userId, role, cancellationToken)
            ?? throw new InvalidOperationException("Withdrawal request not found.");

        if (entity.Status is not (WithdrawalStatus.Draft or WithdrawalStatus.Issued))
            throw new InvalidOperationException("Documents can only be uploaded while the request is draft or issued.");

        if (RoleNames.IsPreAdviceManager(role) && entity.TruckerId != userId)
            throw new InvalidOperationException("You can only upload documents for your own withdrawal requests.");

        if (documentType == WithdrawalDocumentType.AtwCertificate)
        {
            var existing = await _db.WithdrawalDocuments
                .Where(d => d.WithdrawalRequestId == id && d.DocumentType == WithdrawalDocumentType.AtwCertificate)
                .ToListAsync(cancellationToken);
            foreach (var doc in existing)
                _db.Remove(doc);
        }

        var document = new WithdrawalDocument
        {
            WithdrawalRequestId = id,
            DocumentType = documentType,
            FileName = fileName,
            FilePath = filePath,
            ContentType = contentType,
            FileSize = fileSize,
            UploadedById = userId,
        };

        _db.Add(document);
        _auditService.QueueLog(userId, "UploadDocument", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        return new WithdrawalDocumentDto(
            document.Id,
            document.WithdrawalRequestId,
            document.DocumentType,
            document.FileName,
            document.FilePath,
            document.ContentType,
            document.FileSize,
            document.CreatedAt);
    }

    public async Task<bool> DeleteDocumentAsync(
        int withdrawalId,
        int documentId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await FindScopedAsync(withdrawalId, userId, role, cancellationToken);
        if (entity is null) return false;

        if (entity.Status is not (WithdrawalStatus.Draft or WithdrawalStatus.Issued))
            throw new InvalidOperationException("Documents can only be removed while the request is draft or issued.");

        var document = await _db.WithdrawalDocuments
            .FirstOrDefaultAsync(d => d.Id == documentId && d.WithdrawalRequestId == withdrawalId, cancellationToken);
        if (document is null) return false;

        _db.Remove(document);
        _auditService.QueueLog(userId, "DeleteDocument", "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<WithdrawalRequest> BaseQuery() =>
        _db.WithdrawalRequests
            .Include(w => w.Trucker)
            .Include(w => w.ShippingLine)
            .Include(w => w.CurrentDepot)
            .Include(w => w.Lines)
                .ThenInclude(l => l.Container)
            .Include(w => w.Lines)
                .ThenInclude(l => l.ContainerSize)
            .Include(w => w.Lines)
                .ThenInclude(l => l.ContainerType);

    private async Task<IQueryable<WithdrawalRequest>> ApplyRoleScopeAsync(
        IQueryable<WithdrawalRequest> query,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (RoleNames.IsPreAdviceManager(role))
            return query.Where(w => w.TruckerId == userId);

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var shippingLineId = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.ShippingLineId)
                .FirstOrDefaultAsync(cancellationToken);
            return shippingLineId.HasValue
                ? query.Where(w => w.ShippingLineId == shippingLineId.Value)
                : query.Where(_ => false);
        }

        if (role == RoleNames.DepotPersonnel)
        {
            var depotId = await GetUserDepotIdAsync(userId, cancellationToken);
            return depotId.HasValue
                ? query.Where(w => w.CurrentDepotId == depotId.Value)
                : query.Where(_ => false);
        }

        if (role == RoleNames.Administrator)
            return query;

        return query.Where(_ => false);
    }

    private async Task<int?> GetUserDepotIdAsync(int userId, CancellationToken cancellationToken) =>
        await _db.Users.Where(u => u.Id == userId).Select(u => u.DepotId).FirstOrDefaultAsync(cancellationToken);

    private async Task<WithdrawalRequest> RequireDepotReviewAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role != RoleNames.DepotPersonnel)
            throw new InvalidOperationException("Only depot personnel can perform this action.");

        var entity = await FindScopedAsync(id, userId, role, cancellationToken)
            ?? throw new InvalidOperationException("Withdrawal request not found.");

        return entity;
    }

    private async Task<WithdrawalRequest?> FindScopedAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        var query = await ApplyRoleScopeAsync(BaseQuery().Where(w => w.Id == id), userId, role, cancellationToken);
        return await query.FirstOrDefaultAsync(cancellationToken);
    }

    private static WithdrawalDto MapToDto(WithdrawalRequest w, bool hasAtwDocument)
    {
        var orderedLines = w.Lines.OrderBy(l => l.LineNo).ToList();
        var lineDtos = orderedLines
            .Select(l => new WithdrawalLineDto(
                l.Id,
                l.LineNo,
                l.ContainerId,
                l.Container.ContainerNo,
                l.ContainerSizeId,
                l.ContainerSize.Label,
                l.ContainerTypeId,
                l.ContainerType.Label,
                l.LineStatus))
            .ToList();

        return new WithdrawalDto(
            w.Id,
            w.ReferenceNo,
            w.AtwNumber,
            w.TruckerId,
            w.Trucker.FullName ?? w.Trucker.Username,
            w.ShippingLineId,
            w.ShippingLine.Name,
            w.CurrentDepotId,
            w.CurrentDepot.Name,
            w.Destination,
            w.IssueDate.ToString("yyyy-MM-dd"),
            w.ExpirationDate.ToString("yyyy-MM-dd"),
            w.Purpose,
            w.Status,
            w.Remarks,
            w.CreatedAt,
            w.SubmittedAt,
            hasAtwDocument,
            w.ReviewRemarks,
            orderedLines.Count,
            BuildContainerSummary(orderedLines),
            lineDtos);
    }

    private static string BuildContainerSummary(IReadOnlyList<WithdrawalRequestLine> lines) =>
        lines.Count == 0
            ? "—"
            : string.Join(", ", lines
                .GroupBy(l => $"{l.ContainerSize.Label} {l.ContainerType.Label}")
                .OrderBy(g => g.Key)
                .Select(g => $"{g.Count()}×{g.Key}"));

    private async Task<HashSet<int>> LoadAtwDocumentIdsAsync(IReadOnlyList<int> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0) return new HashSet<int>();
        var withDocs = await _db.WithdrawalDocuments
            .AsNoTracking()
            .Where(d => ids.Contains(d.WithdrawalRequestId) && d.DocumentType == WithdrawalDocumentType.AtwCertificate)
            .Select(d => d.WithdrawalRequestId)
            .Distinct()
            .ToListAsync(cancellationToken);
        return withDocs.ToHashSet();
    }

    private sealed record HeaderValidation(string AtwNumber, string Destination, DateOnly IssueDate, DateOnly ExpirationDate, string? Remarks);
    private sealed record LineMaterialization(int ContainerId, string NormalizedNo, int ContainerSizeId, int ContainerTypeId, string SizeLabel, string TypeCode);
    private sealed record DuplicateMatch(string ReferenceNo, WithdrawalStatus Status, string TruckerName);

    private async Task<HeaderValidation> ValidateHeaderAsync(
        string atwNumber,
        int shippingLineId,
        int currentDepotId,
        string destination,
        string issueDate,
        string expirationDate,
        string? remarks,
        CancellationToken cancellationToken)
    {
        var normalizedAtw = WithdrawalDuplicateGuard.NormalizeAtwNumber(atwNumber);
        if (string.IsNullOrWhiteSpace(normalizedAtw))
            throw new InvalidOperationException("ATW number is required.");

        if (string.IsNullOrWhiteSpace(destination?.Trim()))
            throw new InvalidOperationException("Destination is required.");

        if (!await _db.ShippingLines.AnyAsync(s => s.Id == shippingLineId && s.IsActive, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        if (!await _db.Depots.AnyAsync(d => d.Id == currentDepotId, cancellationToken))
            throw new InvalidOperationException("Container yard not found.");

        if (!DateOnly.TryParse(issueDate, out var parsedIssue))
            throw new InvalidOperationException("Invalid issue date.");

        if (!DateOnly.TryParse(expirationDate, out var parsedExpiration))
            throw new InvalidOperationException("Invalid expiration date.");

        if (parsedExpiration < parsedIssue)
            throw new InvalidOperationException("Expiration date must be on or after issue date.");

        return new HeaderValidation(
            normalizedAtw,
            destination.Trim(),
            parsedIssue,
            parsedExpiration,
            string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim());
    }

    private async Task<IReadOnlyList<LineMaterialization>> MaterializeLinesAsync(
        IReadOnlyList<WithdrawalLineInput> lines,
        int shippingLineId,
        CancellationToken cancellationToken)
    {
        if (lines is null || lines.Count == 0)
            throw new InvalidOperationException("Add at least one container.");

        if (lines.Count > 50)
            throw new InvalidOperationException("A maximum of 50 containers is allowed per ATW batch.");

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var materialized = new List<LineMaterialization>();

        foreach (var input in lines)
        {
            if (input.ContainerSizeId <= 0 || input.ContainerTypeId <= 0)
                throw new InvalidOperationException("Each container line must have a size and type.");

            var size = await _db.ContainerSizes
                .FirstOrDefaultAsync(s => s.Id == input.ContainerSizeId && s.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("Invalid container size.");

            var type = await _db.ContainerTypes
                .FirstOrDefaultAsync(t => t.Id == input.ContainerTypeId && t.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("Invalid container type.");

            var normalizedNo = WithdrawalDuplicateGuard.NormalizeContainerNo(input.ContainerNo);
            if (string.IsNullOrWhiteSpace(normalizedNo))
                throw new InvalidOperationException("Each container line must have a container number.");

            var identityKey = WithdrawalDuplicateGuard.BuildLineIdentityKey(normalizedNo, input.ContainerSizeId, input.ContainerTypeId);
            if (!seen.Add(identityKey))
                throw new InvalidOperationException($"Duplicate container in batch: {normalizedNo} ({size.Label} {type.Label}).");

            var containerId = await ResolveOrTrackContainerAsync(
                shippingLineId,
                normalizedNo,
                size.Label,
                type.Code,
                cancellationToken);

            materialized.Add(new LineMaterialization(
                containerId,
                normalizedNo,
                input.ContainerSizeId,
                input.ContainerTypeId,
                size.Label,
                type.Code));
        }

        return materialized;
    }

    private static void AttachLines(WithdrawalRequest entity, IReadOnlyList<LineMaterialization> lineRows)
    {
        for (var i = 0; i < lineRows.Count; i++)
        {
            var row = lineRows[i];
            entity.Lines.Add(new WithdrawalRequestLine
            {
                LineNo = i + 1,
                ContainerId = row.ContainerId,
                ContainerNoNormalized = row.NormalizedNo,
                ContainerSizeId = row.ContainerSizeId,
                ContainerTypeId = row.ContainerTypeId,
                LineStatus = WithdrawalLineStatus.Pending,
            });
        }
    }

    private async Task ReplaceLinesAsync(
        WithdrawalRequest entity,
        IReadOnlyList<LineMaterialization> lineRows,
        CancellationToken cancellationToken)
    {
        var existing = await _db.WithdrawalRequestLines
            .Where(l => l.WithdrawalRequestId == entity.Id)
            .ToListAsync(cancellationToken);
        foreach (var line in existing)
            _db.Remove(line);

        entity.Lines.Clear();
        AttachLines(entity, lineRows);
    }

    private async Task<int> ResolveOrTrackContainerAsync(
        int shippingLineId,
        string normalizedNo,
        string sizeLabel,
        string typeCode,
        CancellationToken cancellationToken)
    {
        var container = await _db.Containers
            .FirstOrDefaultAsync(c => c.ContainerNo == normalizedNo, cancellationToken);

        if (container is not null)
        {
            if (container.ShippingLineId != shippingLineId)
                throw new InvalidOperationException($"Container {normalizedNo} belongs to a different shipping line.");
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

    private async Task<string> GenerateReferenceNoAsync(CancellationToken cancellationToken)
    {
        var today = PhilippinesTime.Today.ToString("yyyyMMdd");
        var prefix = $"WR-{today}-";
        var latest = await _db.WithdrawalRequests
            .Where(w => w.ReferenceNo.StartsWith(prefix))
            .OrderByDescending(w => w.ReferenceNo)
            .Select(w => w.ReferenceNo)
            .FirstOrDefaultAsync(cancellationToken);

        var seq = 1;
        if (latest is not null)
        {
            var suffix = latest[prefix.Length..];
            if (int.TryParse(suffix, out var n))
                seq = n + 1;
        }

        return $"{prefix}{seq:D4}";
    }

    private async Task<string> GenerateNextAtwNumberAsync(int shippingLineId, CancellationToken cancellationToken)
    {
        var year = PhilippinesTime.Today.Year;
        var prefix = $"ATW-{year}-";
        var latest = await _db.WithdrawalRequests
            .Where(w => w.ShippingLineId == shippingLineId && w.AtwNumber.StartsWith(prefix))
            .OrderByDescending(w => w.AtwNumber)
            .Select(w => w.AtwNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var seq = 1;
        if (latest is not null && latest.Length > prefix.Length)
        {
            var suffix = latest[prefix.Length..];
            if (int.TryParse(suffix, out var n))
                seq = n + 1;
        }

        return $"{prefix}{seq:D3}";
    }

    private async Task EnsureNoDuplicateAsync(
        int depotId,
        string normalizedNo,
        int containerSizeId,
        int containerTypeId,
        int? excludeId,
        CancellationToken cancellationToken)
    {
        var duplicate = await FindDuplicateAsync(depotId, normalizedNo, containerSizeId, containerTypeId, excludeId, cancellationToken);
        if (duplicate is not null)
            throw new InvalidOperationException(
                $"Duplicate withdrawal for {normalizedNo}: {duplicate.ReferenceNo} ({duplicate.Status}) by {duplicate.TruckerName}.");
    }

    private async Task<DuplicateMatch?> FindDuplicateAsync(
        int depotId,
        string normalizedNo,
        int containerSizeId,
        int containerTypeId,
        int? excludeWithdrawalId,
        CancellationToken cancellationToken)
    {
        var key = WithdrawalDuplicateGuard.BuildKey(depotId, normalizedNo, containerSizeId, containerTypeId);
        return await _db.WithdrawalRequestLines
            .AsNoTracking()
            .Where(l => l.ActiveRequestKey == key)
            .Where(l => excludeWithdrawalId == null || l.WithdrawalRequestId != excludeWithdrawalId.Value)
            .Select(l => new DuplicateMatch(
                l.WithdrawalRequest.ReferenceNo,
                l.WithdrawalRequest.Status,
                l.WithdrawalRequest.Trucker.FullName ?? l.WithdrawalRequest.Trucker.Username))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException?.Message.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) == true
        || ex.InnerException?.Message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase) == true;
}
