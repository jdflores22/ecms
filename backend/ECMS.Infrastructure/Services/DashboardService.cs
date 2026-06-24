using ECMS.Domain.Common;
using ECMS.Application.DTOs.Dashboard;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly IEcmsDbContext _db;

    public DashboardService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<BrokerDashboardDto> GetBrokerDashboardAsync(int brokerId, CancellationToken cancellationToken = default)
    {
        var preAdvices = await _db.PreAdvices.Where(p => p.BrokerId == brokerId).ToListAsync(cancellationToken);
        var completed = await _db.Schedules
            .Include(s => s.PreAdvice)
            .CountAsync(s => s.PreAdvice.BrokerId == brokerId && s.Status == ScheduleStatus.Completed, cancellationToken);

        return new BrokerDashboardDto(
            preAdvices.Count,
            preAdvices.Count(p => p.Status is PreAdviceStatus.Draft or PreAdviceStatus.Submitted or PreAdviceStatus.UnderEvaluation),
            preAdvices.Count(p => p.Status == PreAdviceStatus.Approved),
            preAdvices.Count(p => p.Status == PreAdviceStatus.Rejected),
            completed);
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

        return new ShippingLineDashboardDto(
            await preAdvices.CountAsync(p => p.Status == PreAdviceStatus.Submitted || p.Status == PreAdviceStatus.UnderEvaluation, cancellationToken),
            evaluations.Count(e => e.Status == PreAdviceStatus.Approved),
            evaluations.Count(e => e.Status == PreAdviceStatus.Rejected),
            assignedCy);
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
                (s.Status != ScheduleStatus.WaitingSchedule || s.SlotNo > 0),
                cancellationToken);

        var todaysReturns = occupied;

        return new DepotDashboardDto(
            todaysReturns,
            Math.Max(0, dailyLimit - occupied),
            occupied,
            Math.Max(0, depot.Capacity - occupied));
    }

    public async Task<TruckerDashboardDto> GetTruckerDashboardAsync(int truckerId, CancellationToken cancellationToken = default)
    {
        var schedules = await _db.Schedules
            .Include(s => s.Payment)
            .Where(s => s.TruckerId == truckerId)
            .ToListAsync(cancellationToken);

        return new TruckerDashboardDto(
            schedules.Count(s => s.Status == ScheduleStatus.Scheduled),
            schedules.Count(s => s.Payment == null || s.Payment.Status == PaymentStatus.Pending),
            schedules.Count(s => s.Status == ScheduleStatus.Confirmed),
            schedules.Count(s => s.Status == ScheduleStatus.Completed));
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken cancellationToken = default)
    {
        var pendingEvaluations = await _db.PreAdvices.CountAsync(
            p => p.Status == PreAdviceStatus.Submitted || p.Status == PreAdviceStatus.UnderEvaluation,
            cancellationToken);

        var activeSchedules = await _db.Schedules.CountAsync(
            s => s.Status == ScheduleStatus.Scheduled || s.Status == ScheduleStatus.Confirmed,
            cancellationToken);

        return new AdminDashboardDto(
            await _db.Users.CountAsync(cancellationToken),
            await _db.PreAdvices.CountAsync(cancellationToken),
            pendingEvaluations,
            activeSchedules);
    }
}
