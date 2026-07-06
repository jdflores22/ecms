using ECMS.Application;
using ECMS.Domain.Common;
using ECMS.Application.DTOs.Evaluation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class EvaluationService : IEvaluationService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;
    private readonly ICyAllocationService _cyAllocations;

    public EvaluationService(
        IEcmsDbContext db,
        IAuditService auditService,
        INotificationService notifications,
        ICyAllocationService cyAllocations)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
        _cyAllocations = cyAllocations;
    }

    public async Task<IReadOnlyList<EvaluationDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.Evaluations
            .Include(e => e.PreAdvice)
            .Include(e => e.Evaluator)
            .Include(e => e.Depot)
            .AsQueryable();

        if (role == RoleNames.ShippingLineEvaluator)
            query = query.Where(e => e.EvaluatorId == userId);

        var items = await query.OrderByDescending(e => e.EvaluatedAt).ToListAsync(cancellationToken);
        return items.Select(MapToDto).ToList();
    }

    public async Task<int> GetPendingCountAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            return 0;

        var shippingLineId = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.ShippingLineId)
            .FirstOrDefaultAsync(cancellationToken);
        if (!shippingLineId.HasValue)
            return 0;

        return await _db.PreAdvices.CountAsync(
            p => p.ShippingLineId == shippingLineId.Value
                && (p.Status == PreAdviceStatus.Submitted
                    || p.Status == PreAdviceStatus.UnderEvaluation
                    || p.Status == PreAdviceStatus.ForCompliance),
            cancellationToken);
    }

    public async Task<bool> CanAccessPreAdviceAsync(
        int preAdviceId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var preAdvice = await _db.PreAdvices.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == preAdviceId, cancellationToken);
        if (preAdvice is null)
            return false;

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
            return user.ShippingLineId.HasValue
                && user.ShippingLineId.Value == preAdvice.ShippingLineId;
        }

        return role == RoleNames.Administrator;
    }

    public async Task<EvaluationDto?> GetByPreAdviceIdAsync(
        int preAdviceId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var evaluation = await _db.Evaluations
            .Include(e => e.PreAdvice)
            .Include(e => e.Evaluator)
            .Include(e => e.Depot)
            .FirstOrDefaultAsync(e => e.PreAdviceId == preAdviceId, cancellationToken);

        if (evaluation is null)
            return null;

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue
                || user.ShippingLineId.Value != evaluation.PreAdvice.ShippingLineId)
            {
                return null;
            }
        }
        else if (role != RoleNames.Administrator)
        {
            return null;
        }

        return MapToDto(evaluation);
    }

    public async Task<EvaluationDto> ApproveAsync(
        ApproveEvaluationRequest request,
        int evaluatorId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var preAdvice = await _db.PreAdvices
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-forecast is not eligible for approval.");

        if (request.DemurrageValidUntil < PhilippinesTime.Today)
            throw new InvalidOperationException("Demurrage validity date cannot be in the past.");

        await _cyAllocations.EnsureCapacityForApprovalAsync(
            request.PreAdviceId,
            request.DepotId,
            evaluatorId,
            role,
            cancellationToken);

        preAdvice.Status = PreAdviceStatus.Approved;
        preAdvice.DemurrageValidUntil = request.DemurrageValidUntil;
        var evaluation = preAdvice.Evaluation ?? new Evaluation { PreAdviceId = preAdvice.Id };
        evaluation.EvaluatorId = evaluatorId;
        evaluation.DepotId = request.DepotId;
        evaluation.Remarks = request.Remarks;
        evaluation.Status = PreAdviceStatus.Approved;
        evaluation.EvaluatedAt = PhilippinesTime.UtcNow;

        if (preAdvice.Evaluation is null)
            _db.Add(evaluation);
        else
            _db.Update(evaluation);

        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);
        _db.Update(preAdvice);

        var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.PreAdviceId == preAdvice.Id, cancellationToken);
        if (schedule is null)
        {
            _db.Add(new Schedule
            {
                PreAdviceId = preAdvice.Id,
                DepotId = request.DepotId,
                Status = ScheduleStatus.WaitingSchedule,
                Date = PhilippinesTime.Today,
                Time = new TimeOnly(8, 0),
                SlotNo = 0,
                TruckerId = preAdvice.TruckerId
            });
        }

        _auditService.QueueLog(evaluatorId, "Approve", "Evaluation", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var depot = await _db.Depots.FirstAsync(d => d.Id == request.DepotId, cancellationToken);
        var depotIds = await NotificationService.DepotPersonnelIdsAsync(_db, request.DepotId, cancellationToken);
        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { preAdvice.TruckerId },
            "Pre-forecast approved",
            $"{preAdvice.ReferenceNo} was approved. CY: {depot.Name}.",
            "Evaluation",
            $"/preforecast/{preAdvice.Id}",
            evaluatorId,
            preAdvice.ReferenceNo,
            cancellationToken);

        await _notifications.NotifyUsersAsync(
            depotIds.Concat(adminIds),
            "Approved return awaiting schedule",
            $"{preAdvice.ReferenceNo} approved — assign return date and time.",
            "Evaluation",
            "/depot/schedules",
            evaluatorId,
            preAdvice.ReferenceNo,
            cancellationToken);

        evaluation.PreAdvice = preAdvice;
        evaluation.Evaluator = await _db.Users.FirstAsync(u => u.Id == evaluatorId, cancellationToken);
        evaluation.Depot = depot;

        return MapToDto(evaluation);
    }

    public async Task<EvaluationDto> RejectAsync(RejectEvaluationRequest request, int evaluatorId, CancellationToken cancellationToken = default)
    {
        var preAdvice = await _db.PreAdvices
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-forecast is not eligible for rejection.");

        preAdvice.Status = PreAdviceStatus.Rejected;
        var evaluation = preAdvice.Evaluation ?? new Evaluation { PreAdviceId = preAdvice.Id };
        evaluation.EvaluatorId = evaluatorId;
        evaluation.Remarks = request.Remarks;
        evaluation.Status = PreAdviceStatus.Rejected;
        evaluation.EvaluatedAt = PhilippinesTime.UtcNow;

        if (preAdvice.Evaluation is null)
            _db.Add(evaluation);
        else
            _db.Update(evaluation);

        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);
        _db.Update(preAdvice);
        _auditService.QueueLog(evaluatorId, "Reject", "Evaluation", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { preAdvice.TruckerId },
            "Pre-forecast rejected",
            $"{preAdvice.ReferenceNo} was rejected.{(string.IsNullOrWhiteSpace(request.Remarks) ? "" : $" Remarks: {request.Remarks}")}",
            "Evaluation",
            $"/preforecast/{preAdvice.Id}",
            evaluatorId,
            preAdvice.ReferenceNo,
            cancellationToken);

        evaluation.PreAdvice = preAdvice;
        evaluation.Evaluator = await _db.Users.FirstAsync(u => u.Id == evaluatorId, cancellationToken);

        return MapToDto(evaluation);
    }

    public async Task<EvaluationDto> ReturnForComplianceAsync(
        ReturnForComplianceRequest request,
        int evaluatorId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException("Compliance instructions are required.");

        var preAdvice = await _db.PreAdvices
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-forecast is not eligible for compliance review.");

        preAdvice.Status = PreAdviceStatus.ForCompliance;
        var evaluation = preAdvice.Evaluation ?? new Evaluation { PreAdviceId = preAdvice.Id };
        evaluation.EvaluatorId = evaluatorId;
        evaluation.DepotId = null;
        evaluation.Remarks = request.Remarks.Trim();
        evaluation.Status = PreAdviceStatus.ForCompliance;
        evaluation.EvaluatedAt = PhilippinesTime.UtcNow;

        if (preAdvice.Evaluation is null)
            _db.Add(evaluation);
        else
            _db.Update(evaluation);

        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);
        _db.Update(preAdvice);
        _auditService.QueueLog(evaluatorId, "ReturnForCompliance", "Evaluation", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { preAdvice.TruckerId },
            "Pre-forecast returned for compliance",
            $"{preAdvice.ReferenceNo} needs corrections before it can be approved. {request.Remarks.Trim()}",
            "Evaluation",
            $"/preforecast/{preAdvice.Id}",
            evaluatorId,
            preAdvice.ReferenceNo,
            cancellationToken);

        evaluation.PreAdvice = preAdvice;
        evaluation.Evaluator = await _db.Users.FirstAsync(u => u.Id == evaluatorId, cancellationToken);

        return MapToDto(evaluation);
    }

    private static EvaluationDto MapToDto(Evaluation e) => new(
        e.Id, e.PreAdviceId, e.PreAdvice.ReferenceNo, e.EvaluatorId,
        e.Evaluator.FullName ?? e.Evaluator.Username, e.DepotId, e.Depot?.Name,
        e.Remarks, e.Status.ToString(), e.EvaluatedAt);
}
