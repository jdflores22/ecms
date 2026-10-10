using ECMS.Application;
using ECMS.Domain.Common;
using ECMS.Application.DTOs.DemurrageBilling;
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
    private readonly IDemurrageBillingService _demurrageBilling;

    public EvaluationService(
        IEcmsDbContext db,
        IAuditService auditService,
        INotificationService notifications,
        ICyAllocationService cyAllocations,
        IDemurrageBillingService demurrageBilling)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
        _cyAllocations = cyAllocations;
        _demurrageBilling = demurrageBilling;
    }

    public async Task<IReadOnlyList<EvaluationDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.Evaluations
            .Include(e => e.PreAdvice)
            .Include(e => e.Evaluator)
            .Include(e => e.Depot)
            .AsQueryable();

        if (role == RoleNames.ShippingLineEvaluator)
        {
            var shippingLineId = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.ShippingLineId)
                .FirstOrDefaultAsync(cancellationToken);
            if (!shippingLineId.HasValue)
                return Array.Empty<EvaluationDto>();
            query = query.Where(e => e.PreAdvice.ShippingLineId == shippingLineId);
        }

        var items = await query.OrderByDescending(e => e.EvaluatedAt).ToListAsync(cancellationToken);
        return items.Select(MapToDto).ToList();
    }

    public async Task<int> GetPendingCountAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        if (role == RoleNames.Administrator)
        {
            return await _db.PreAdvices.CountAsync(
                p => p.Status == PreAdviceStatus.Submitted
                    || p.Status == PreAdviceStatus.UnderEvaluation
                    || p.Status == PreAdviceStatus.ForCompliance,
                cancellationToken);
        }

        return 0;
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
        if (role != RoleNames.Administrator)
            throw new UnauthorizedAccessException("Only system administrators can approve pre-forecasts and assign container yards.");

        if (!await CanAccessPreAdviceAsync(request.PreAdviceId, evaluatorId, role, cancellationToken))
            throw new UnauthorizedAccessException("You are not allowed to evaluate this pre-forecast.");

        var preAdvice = await _db.PreAdvices
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-forecast is not eligible for approval.");

        if (!request.DemurrageValidUntil.HasValue)
        {
            throw new InvalidOperationException(
                "Enter the CRO/eDO free time date when approving so the trucker can schedule empty return.");
        }

        var demurrageUntil = request.DemurrageValidUntil.Value;
        var today = PhilippinesTime.Today;

        if (demurrageUntil < today)
        {
            throw new InvalidOperationException(
                "Free time date must be today or later when approving.");
        }

        var previousUntil = preAdvice.DemurrageValidUntil;
        if (previousUntil.HasValue && previousUntil.Value < today && demurrageUntil <= previousUntil.Value)
        {
            throw new InvalidOperationException(
                "Previous free time expired. Set a new free time date after the expired date.");
        }

        if (previousUntil.HasValue && previousUntil.Value < today)
        {
            var detDemPaid = await _db.DemurrageBillings.AnyAsync(
                b => b.PreAdviceId == preAdvice.Id && b.Status == PaymentStatus.Paid,
                cancellationToken);
            if (!detDemPaid)
            {
                throw new InvalidOperationException(
                    "CRO/eDO free time has expired. Open DET-DEM for the trucker to upload shipping line payment proof, then approve after ICS verifies the receipt.");
            }
        }

        await _cyAllocations.EnsureCapacityForApprovalAsync(
            request.PreAdviceId,
            request.DepotId,
            evaluatorId,
            role,
            cancellationToken);

        preAdvice.Status = PreAdviceStatus.Approved;
        preAdvice.DemurrageValidUntil = demurrageUntil;
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
            $"{preAdvice.ReferenceNo} was approved by ICS. {TruckerScheduleVisibility.AwaitingCyConfirmation}",
            "Evaluation",
            $"/trucker/preforecast/{preAdvice.Id}",
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

    public async Task SetCroFreeTimeAsync(
        int preAdviceId,
        DateOnly freeTimeDate,
        int adminId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.Administrator)
            throw new UnauthorizedAccessException("Only system administrators can set CRO/eDO free time.");

        if (!await CanAccessPreAdviceAsync(preAdviceId, adminId, role, cancellationToken))
            throw new UnauthorizedAccessException("You are not allowed to evaluate this pre-forecast.");

        var preAdvice = await _db.PreAdvices.FirstOrDefaultAsync(p => p.Id == preAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.Status is not (
            PreAdviceStatus.Submitted
            or PreAdviceStatus.UnderEvaluation
            or PreAdviceStatus.ForCompliance))
        {
            throw new InvalidOperationException("Free time can only be set while the pre-forecast is under ICS review.");
        }

        preAdvice.DemurrageValidUntil = freeTimeDate;
        _db.Update(preAdvice);
        _auditService.QueueLog(
            adminId,
            "SetCroFreeTime",
            "PreAdvice",
            $"{preAdvice.ReferenceNo} free time {freeTimeDate:yyyy-MM-dd}");
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<EvaluationDto> RejectAsync(
        RejectEvaluationRequest request,
        int evaluatorId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.Administrator)
            throw new UnauthorizedAccessException("Only system administrators can reject pre-forecasts.");

        if (!await CanAccessPreAdviceAsync(request.PreAdviceId, evaluatorId, role, cancellationToken))
            throw new UnauthorizedAccessException("You are not allowed to evaluate this pre-forecast.");

        var preAdvice = await _db.PreAdvices
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.Status is not (PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation))
            throw new InvalidOperationException("Pre-forecast is not eligible for rejection.");

        var today = PhilippinesTime.Today;
        var freeExpired = preAdvice.DemurrageValidUntil.HasValue
            && preAdvice.DemurrageValidUntil.Value < today;

        DemurrageBillingDto? detDem = null;
        if (freeExpired)
        {
            detDem = await _demurrageBilling.EnsureBillingForExpiredFreeTimeAsync(
                preAdvice.Id,
                evaluatorId,
                cancellationToken,
                shippingLineReceiptOnly: true);
        }

        var evaluation = preAdvice.Evaluation ?? new Evaluation { PreAdviceId = preAdvice.Id };
        evaluation.EvaluatorId = evaluatorId;
        evaluation.Remarks = request.Remarks;
        evaluation.EvaluatedAt = PhilippinesTime.UtcNow;

        if (freeExpired)
        {
            preAdvice.Status = PreAdviceStatus.ForCompliance;
            evaluation.Remarks = string.IsNullOrWhiteSpace(request.Remarks)
                ? "CRO/eDO free time expired. Upload shipping line DET-DEM payment receipt (linked DET-DEM record) before ICS can approve this pre-forecast."
                : request.Remarks.Trim();
            evaluation.Status = PreAdviceStatus.ForCompliance;
        }
        else
        {
            preAdvice.Status = PreAdviceStatus.Rejected;
            evaluation.Status = PreAdviceStatus.Rejected;
        }

        if (preAdvice.Evaluation is null)
            _db.Add(evaluation);
        else
            _db.Update(evaluation);

        PreAdviceDuplicateGuard.RefreshActiveKey(preAdvice);
        _db.Update(preAdvice);
        _auditService.QueueLog(evaluatorId, "Reject", "Evaluation", preAdvice.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);

        var rejectMessage = freeExpired
            ? $"{preAdvice.ReferenceNo} — CRO/eDO free time expired. DET-DEM {detDem?.ReferenceNo} is linked to this pre-forecast. " +
              "Pay the shipping line, then upload your payment receipt in DET-DEM."
            : $"{preAdvice.ReferenceNo} was rejected.{(string.IsNullOrWhiteSpace(request.Remarks) ? "" : $" Remarks: {request.Remarks}")}";

        await _notifications.NotifyUsersAsync(
            new[] { preAdvice.TruckerId },
            freeExpired ? "Expired CRO/eDO — upload DET-DEM receipt" : "Pre-forecast rejected",
            rejectMessage,
            "Evaluation",
            freeExpired && detDem is not null
                ? $"/trucker/demurrage-billing/{detDem.Id}"
                : $"/trucker/preforecast/{preAdvice.Id}",
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
        string role,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException("Compliance instructions are required.");

        if (role != RoleNames.Administrator)
            throw new UnauthorizedAccessException("Only system administrators can return pre-forecasts for compliance.");

        if (!await CanAccessPreAdviceAsync(request.PreAdviceId, evaluatorId, role, cancellationToken))
            throw new UnauthorizedAccessException("You are not allowed to evaluate this pre-forecast.");

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
            $"/trucker/preforecast/{preAdvice.Id}",
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
