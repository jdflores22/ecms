using ECMS.Application.DTOs.Schedule;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ScheduleService : IScheduleService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;
    private readonly ISlotCapacityService _slotCapacity;

    public ScheduleService(
        IEcmsDbContext db,
        IAuditService auditService,
        INotificationService notifications,
        ISlotCapacityService slotCapacity)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
        _slotCapacity = slotCapacity;
    }

    public async Task<IReadOnlyList<ScheduleDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.Schedules
            .Include(s => s.PreAdvice)
            .Include(s => s.Depot)
            .Include(s => s.Trucker)
            .AsQueryable();

        if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.DepotId.HasValue)
                query = query.Where(s => s.DepotId == user.DepotId);
        }
        else if (RoleNames.IsPreAdviceManager(role))
            query = query.Where(s => s.PreAdvice.TruckerId == userId);

        var items = await query.OrderBy(s => s.Date).ThenBy(s => s.Time).ToListAsync(cancellationToken);
        return items.Select(MapToDto).ToList();
    }

    public async Task<ScheduleDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.Schedules
            .Include(s => s.PreAdvice)
            .Include(s => s.Depot)
            .Include(s => s.Trucker)
            .AsQueryable();

        if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.DepotId.HasValue)
                query = query.Where(s => s.DepotId == user.DepotId);
        }
        else if (RoleNames.IsPreAdviceManager(role))
            query = query.Where(s => s.PreAdvice.TruckerId == userId);

        var schedule = await query.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        return schedule is null ? null : MapToDto(schedule);
    }

    public async Task<ScheduleDto?> GetByPreAdviceIdAsync(int preAdviceId, int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.Schedules
            .Include(s => s.PreAdvice)
            .Include(s => s.Depot)
            .Include(s => s.Trucker)
            .Where(s => s.PreAdviceId == preAdviceId);

        if (RoleNames.IsPreAdviceManager(role))
            query = query.Where(s => s.PreAdvice.TruckerId == userId);
        else if (role == RoleNames.DepotPersonnel)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.DepotId.HasValue)
                query = query.Where(s => s.DepotId == user.DepotId);
        }
        else if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.ShippingLineId.HasValue)
                query = query.Where(s => s.PreAdvice.ShippingLineId == user.ShippingLineId);
        }

        var schedule = await query.FirstOrDefaultAsync(cancellationToken);
        return schedule is null ? null : MapToDto(schedule);
    }

    public async Task<ScheduleDto> CreateAsync(CreateScheduleRequest request, int actorUserId, CancellationToken cancellationToken = default)
    {
        if (request.Date < PhilippinesTime.Today)
            throw new InvalidOperationException("Return date cannot be in the past.");

        await _slotCapacity.ValidateAssignmentAsync(
            request.DepotId, request.Date, request.SlotNo, null, cancellationToken);

        var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.PreAdviceId == request.PreAdviceId, cancellationToken)
            ?? new Schedule { PreAdviceId = request.PreAdviceId };

        var isNew = schedule.Id == 0;
        schedule.DepotId = request.DepotId;
        schedule.Date = request.Date;
        schedule.Time = request.Time;
        schedule.SlotNo = 0;
        schedule.TruckerId = request.TruckerId;
        schedule.Status = ScheduleStatus.Scheduled;

        if (isNew)
            _db.Add(schedule);
        else
            _db.Update(schedule);

        await _db.SaveChangesAsync(cancellationToken);

        schedule.PreAdvice = await _db.PreAdvices.FirstAsync(p => p.Id == request.PreAdviceId, cancellationToken);
        schedule.Depot = await _db.Depots.FirstAsync(d => d.Id == request.DepotId, cancellationToken);
        if (request.TruckerId.HasValue)
            schedule.Trucker = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.TruckerId, cancellationToken);

        await _auditService.LogAsync(
            actorUserId,
            isNew ? "Create" : "Update",
            "Schedule",
            $"{schedule.PreAdvice.ReferenceNo} · {schedule.Date} {schedule.Time:HH:mm}",
            cancellationToken);

        await NotifyScheduleAssignedAsync(schedule, actorUserId, isNew, cancellationToken);

        return MapToDto(schedule);
    }

    public async Task<ScheduleDto?> UpdateAsync(int id, UpdateScheduleRequest request, int actorUserId, CancellationToken cancellationToken = default)
    {
        var schedule = await _db.Schedules
            .Include(s => s.PreAdvice)
            .Include(s => s.Depot)
            .Include(s => s.Trucker)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (schedule is null) return null;

        if (request.Date < PhilippinesTime.Today)
            throw new InvalidOperationException("Return date cannot be in the past.");

        await _slotCapacity.ValidateAssignmentAsync(
            schedule.DepotId, request.Date, request.SlotNo, schedule.Id, cancellationToken);

        schedule.Date = request.Date;
        schedule.Time = request.Time;
        schedule.SlotNo = 0;
        schedule.Status = request.Status;

        if (!schedule.TruckerId.HasValue)
            schedule.TruckerId = schedule.PreAdvice.TruckerId;

        _db.Update(schedule);
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            actorUserId,
            "Update",
            "Schedule",
            $"{schedule.PreAdvice.ReferenceNo} · {schedule.Date} {schedule.Time:HH:mm}",
            cancellationToken);

        await NotifyScheduleAssignedAsync(schedule, actorUserId, false, cancellationToken);

        return MapToDto(schedule);
    }

    public Task<SlotAvailabilityDto> GetSlotAvailabilityAsync(
        int depotId,
        DateOnly date,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default)
        => _slotCapacity.GetAvailabilityAsync(depotId, date, excludeScheduleId, cancellationToken);

    private async Task NotifyScheduleAssignedAsync(
        Schedule schedule,
        int actorUserId,
        bool isNew,
        CancellationToken cancellationToken)
    {
        var refNo = schedule.PreAdvice.ReferenceNo;
        var dateStr = schedule.Date.ToString("yyyy-MM-dd");
        var timeStr = schedule.Time.ToString("HH:mm");
        var title = isNew ? "Return schedule assigned" : "Return schedule updated";
        var message = $"{refNo} scheduled on {dateStr} at {timeStr}.";

        var recipients = new List<int> { schedule.PreAdvice.TruckerId };
        await _notifications.NotifyUsersAsync(
            recipients,
            title,
            message,
            "Schedule",
            $"/preadvice/{schedule.PreAdviceId}",
            actorUserId,
            refNo,
            cancellationToken);

        if (schedule.TruckerId.HasValue)
        {
            await _notifications.NotifyUsersAsync(
                new[] { schedule.TruckerId.Value },
                title,
                $"{refNo} scheduled on {dateStr} at {timeStr}. Upload payment proof to confirm your return.",
                "Schedule",
                $"/trucker/payments/{schedule.Id}",
                actorUserId,
                refNo,
                cancellationToken);
        }
    }

    private static ScheduleDto MapToDto(Schedule s) => new(
        s.Id, s.PreAdviceId, s.PreAdvice.ReferenceNo, s.DepotId, s.Depot.Name,
        s.Date, s.Time, s.SlotNo, s.Status, s.TruckerId,
        s.Trucker?.FullName ?? s.Trucker?.Username);
}
