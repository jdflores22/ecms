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

    public EvaluationService(IEcmsDbContext db, IAuditService auditService, INotificationService notifications)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
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

    public async Task<EvaluationDto> ApproveAsync(ApproveEvaluationRequest request, int evaluatorId, CancellationToken cancellationToken = default)
    {
        var preAdvice = await _db.PreAdvices
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-advice not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-advice is not eligible for approval.");

        preAdvice.Status = PreAdviceStatus.Approved;
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
                SlotNo = 0
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(evaluatorId, "Approve", "Evaluation", preAdvice.ReferenceNo, cancellationToken);

        var depot = await _db.Depots.FirstAsync(d => d.Id == request.DepotId, cancellationToken);
        var depotIds = await NotificationService.DepotPersonnelIdsAsync(_db, request.DepotId, cancellationToken);
        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { preAdvice.BrokerId },
            "Pre-advice approved",
            $"{preAdvice.ReferenceNo} was approved. CY: {depot.Name}.",
            "Evaluation",
            $"/preadvice/{preAdvice.Id}",
            evaluatorId,
            preAdvice.ReferenceNo,
            cancellationToken);

        await _notifications.NotifyUsersAsync(
            depotIds.Concat(adminIds),
            "Approved return awaiting schedule",
            $"{preAdvice.ReferenceNo} approved — assign return date and trucker.",
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
            ?? throw new InvalidOperationException("Pre-advice not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-advice is not eligible for rejection.");

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

        _db.Update(preAdvice);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(evaluatorId, "Reject", "Evaluation", preAdvice.ReferenceNo, cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { preAdvice.BrokerId },
            "Pre-advice rejected",
            $"{preAdvice.ReferenceNo} was rejected.{(string.IsNullOrWhiteSpace(request.Remarks) ? "" : $" Remarks: {request.Remarks}")}",
            "Evaluation",
            $"/preadvice/{preAdvice.Id}",
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
