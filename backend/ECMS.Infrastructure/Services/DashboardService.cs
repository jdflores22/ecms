using ECMS.Domain.Common;
using ECMS.Application.DTOs.Dashboard;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly IEcmsDbContext _db;
    private static readonly WithdrawalStatus[] ActiveWithdrawalStatuses =
    {
        WithdrawalStatus.Draft,
        WithdrawalStatus.Issued,
        WithdrawalStatus.Submitted,
        WithdrawalStatus.UnderReview,
        WithdrawalStatus.Approved,
    };

    private static readonly string[] ReviewActions = { "Approve", "Reject", "Release" };

    public DashboardService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<ShippingLineDashboardDto> GetShippingLineDashboardAsync(int evaluatorId, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstAsync(u => u.Id == evaluatorId, cancellationToken);
        var today = PhilippinesTime.Today;

        var preAdvices = _db.PreAdvices.AsQueryable();
        if (user.ShippingLineId.HasValue)
            preAdvices = preAdvices.Where(p => p.ShippingLineId == user.ShippingLineId);

        var evaluations = await _db.Evaluations
            .Where(e => e.EvaluatorId == evaluatorId)
            .ToListAsync(cancellationToken);
        evaluations = evaluations
            .Where(e => PhilippinesTime.ToDateOnly(e.EvaluatedAt) == today)
            .ToList();

        var assignedCy = await preAdvices
            .CountAsync(p => p.Status == PreAdviceStatus.Approved, cancellationToken);
        var widgets = await BuildWithdrawalWidgetsAsync(
            _db.WithdrawalRequests.Where(w => user.ShippingLineId.HasValue && w.ShippingLineId == user.ShippingLineId.Value),
            cancellationToken);

        return new ShippingLineDashboardDto(
            await preAdvices.CountAsync(p => p.Status == PreAdviceStatus.Submitted || p.Status == PreAdviceStatus.UnderEvaluation, cancellationToken),
            evaluations.Count(e => e.Status == PreAdviceStatus.Approved),
            evaluations.Count(e => e.Status == PreAdviceStatus.Rejected),
            assignedCy,
            widgets);
    }

    public async Task<DepotDashboardDto> GetDepotDashboardAsync(int depotId, CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        var today = PhilippinesTime.Today;
        var dailyLimit = SlotCapacityService.GetDailyLimit(depot.Capacity);

        var occupied = await _db.Schedules
            .CountAsync(s =>
                s.DepotId == depotId &&
                s.Date == today &&
                s.Status != ScheduleStatus.Cancelled &&
                s.Status != ScheduleStatus.WaitingSchedule,
                cancellationToken);

        var todaysReturns = occupied;
        var widgets = await BuildWithdrawalWidgetsAsync(
            _db.WithdrawalRequests.Where(w => w.CurrentDepotId == depotId),
            cancellationToken);

        return new DepotDashboardDto(
            todaysReturns,
            Math.Max(0, dailyLimit - occupied),
            occupied,
            Math.Max(0, depot.Capacity - occupied),
            widgets);
    }

    public async Task<TruckerDashboardDto> GetTruckerDashboardAsync(int truckerId, CancellationToken cancellationToken = default)
    {
        var schedules = await _db.Schedules
            .Include(s => s.Payment)
            .Where(s => s.TruckerId == truckerId)
            .ToListAsync(cancellationToken);

        var preAdvices = await _db.PreAdvices.Where(p => p.TruckerId == truckerId).ToListAsync(cancellationToken);
        var completedPreAdviceReturns = await _db.Schedules
            .Include(s => s.PreAdvice)
            .CountAsync(s => s.PreAdvice.TruckerId == truckerId && s.Status == ScheduleStatus.Completed, cancellationToken);

        var withdrawals = await _db.WithdrawalRequests.Where(w => w.TruckerId == truckerId).ToListAsync(cancellationToken);
        var widgets = await BuildWithdrawalWidgetsAsync(
            _db.WithdrawalRequests.Where(w => w.TruckerId == truckerId),
            cancellationToken);

        return new TruckerDashboardDto(
            schedules.Count(s => s.Status == ScheduleStatus.Scheduled),
            schedules.Count(s => s.Payment == null || s.Payment.Status == PaymentStatus.Pending),
            schedules.Count(s => s.Status == ScheduleStatus.Confirmed),
            schedules.Count(s => s.Status == ScheduleStatus.Completed),
            preAdvices.Count,
            preAdvices.Count(p => p.Status is PreAdviceStatus.Draft or PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation),
            preAdvices.Count(p => p.Status == PreAdviceStatus.Approved),
            preAdvices.Count(p => p.Status == PreAdviceStatus.Rejected),
            completedPreAdviceReturns,
            withdrawals.Count(w => w.Status == WithdrawalStatus.Draft),
            withdrawals.Count(w => w.Status == WithdrawalStatus.Issued),
            withdrawals.Count(w => w.Status is WithdrawalStatus.Submitted or WithdrawalStatus.UnderReview),
            withdrawals.Count(w => w.Status is WithdrawalStatus.Approved or WithdrawalStatus.Released or WithdrawalStatus.Completed),
            widgets);
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken cancellationToken = default)
    {
        var pendingEvaluations = await _db.PreAdvices.CountAsync(
            p => p.Status == PreAdviceStatus.Submitted || p.Status == PreAdviceStatus.UnderEvaluation,
            cancellationToken);

        var activeSchedules = await _db.Schedules.CountAsync(
            s => s.Status == ScheduleStatus.Scheduled || s.Status == ScheduleStatus.Confirmed,
            cancellationToken);
        var widgets = await BuildWithdrawalWidgetsAsync(_db.WithdrawalRequests, cancellationToken);

        return new AdminDashboardDto(
            await _db.Users.CountAsync(cancellationToken),
            await _db.PreAdvices.CountAsync(cancellationToken),
            pendingEvaluations,
            activeSchedules,
            widgets);
    }

    private async Task<DashboardWidgetsDto> BuildWithdrawalWidgetsAsync(
        IQueryable<Domain.Entities.WithdrawalRequest> scopedWithdrawals,
        CancellationToken cancellationToken)
    {
        var nowUtc = PhilippinesTime.UtcNow;
        var today = PhilippinesTime.Today;
        var within48h = today.AddDays(2);
        var reviewThreshold = nowUtc.AddHours(-24);

        var expiringWithin48Hours = await scopedWithdrawals
            .CountAsync(
                w => ActiveWithdrawalStatuses.Contains(w.Status)
                    && w.ExpirationDate >= today
                    && w.ExpirationDate <= within48h,
                cancellationToken);

        var stuckOver24HoursInReview = await scopedWithdrawals
            .CountAsync(
                w => (w.Status == WithdrawalStatus.Submitted || w.Status == WithdrawalStatus.UnderReview)
                    && w.SubmittedAt.HasValue
                    && w.SubmittedAt.Value <= reviewThreshold,
                cancellationToken);

        var rejectedReasons = await scopedWithdrawals
            .Where(w => w.Status == WithdrawalStatus.Rejected)
            .Select(w => w.ReviewRemarks)
            .ToListAsync(cancellationToken);

        var topRejectedReasons = rejectedReasons
            .Select(NormalizeRejectedReason)
            .GroupBy(reason => reason)
            .Select(g => new DashboardRejectedReasonDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Reason)
            .Take(5)
            .ToList();

        var turnaroundSamples = await (
            from audit in _db.AuditLogs
            join withdrawal in scopedWithdrawals on audit.Details equals withdrawal.ReferenceNo
            where audit.Module == "Withdrawal"
                && ReviewActions.Contains(audit.Action)
                && withdrawal.SubmittedAt.HasValue
            select new { audit.Timestamp, SubmittedAt = withdrawal.SubmittedAt!.Value }
        ).ToListAsync(cancellationToken);

        var depotTurnaroundHours = turnaroundSamples.Count == 0
            ? 0
            : Math.Round(
                turnaroundSamples.Average(x =>
                    Math.Max(0, (x.Timestamp - x.SubmittedAt).TotalHours)),
                1);

        return new DashboardWidgetsDto(
            expiringWithin48Hours,
            stuckOver24HoursInReview,
            depotTurnaroundHours,
            topRejectedReasons);
    }

    private static string NormalizeRejectedReason(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "No reason provided";
        var trimmed = raw.Trim();
        var split = trimmed.Split(new[] { '\n', '.', ';' }, 2, StringSplitOptions.RemoveEmptyEntries);
        var reason = split.Length > 0 ? split[0].Trim() : trimmed;
        if (reason.Length > 80) reason = reason[..80].TrimEnd() + "...";
        return string.IsNullOrWhiteSpace(reason) ? "No reason provided" : reason;
    }
}
