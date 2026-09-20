using ECMS.Application;
using ECMS.Application.DTOs.Schedule;
using ECMS.Application.Interfaces;
using ECMS.Domain.Constants;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class SlotCapacityService : ISlotCapacityService
{
    private readonly IEcmsDbContext _db;

    public SlotCapacityService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<SlotAvailabilityDto> GetAvailabilityAsync(
        int depotId,
        DateOnly date,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        var dailyLimit = GetDailyLimit(depot.Capacity);
        var booked = await GetActiveSchedulesQuery(depotId, date, excludeScheduleId)
            .ToListAsync(cancellationToken);

        var slotMap = booked
            .Where(s => s.SlotNo > 0)
            .ToDictionary(s => s.SlotNo);

        var slots = Enumerable.Range(1, SchedulingConstants.MaxSlotsPerDay)
            .Select(slotNo =>
            {
                if (slotMap.TryGetValue(slotNo, out var schedule))
                {
                    return new SlotInfoDto(
                        slotNo,
                        false,
                        schedule.Id,
                        schedule.PreAdvice.ReferenceNo);
                }

                return new SlotInfoDto(slotNo, true, null, null);
            })
            .ToList();

        return new SlotAvailabilityDto(
            depotId,
            depot.Name,
            date,
            SchedulingConstants.MaxSlotsPerDay,
            dailyLimit,
            booked.Count,
            slots);
    }

    public async Task<HourlySlotAvailabilityDto> GetHourlyAvailabilityAsync(
        int depotId,
        DateOnly date,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        var containersPerHour = Math.Max(1, depot.ContainersPerHour);
        var dailyLimit = GetDailyLimit(depot.Capacity);

        var hourlyBooked = (await GetHourlyActiveSchedulesQuery(depotId, date, excludeScheduleId)
                .ToListAsync(cancellationToken))
            .Where(s => !ScheduleAppointmentRules.IsLegacyDateOnly(s.Time))
            .ToList();

        var dailyBooked = await GetActiveSchedulesQuery(depotId, date, excludeScheduleId)
            .CountAsync(cancellationToken);

        var bookedByHour = hourlyBooked
            .GroupBy(s => s.Time.Hour)
            .ToDictionary(g => g.Key, g => g.Count());

        var hourStart = depot.OperatingHourStart;
        var hourEnd = depot.OperatingHourEnd;
        DepotOperatingHours.Validate(hourStart, hourEnd);

        var slots = Enumerable
            .Range(hourStart, hourEnd - hourStart + 1)
            .Select(hour =>
            {
                var time = new TimeOnly(hour, 0);
                var bookedCount = bookedByHour.GetValueOrDefault(hour, 0);
                return new HourlySlotInfoDto(
                    time,
                    ScheduleAppointmentRules.FormatTimeLabel(time),
                    containersPerHour,
                    bookedCount,
                    bookedCount < containersPerHour);
            })
            .ToList();

        return new HourlySlotAvailabilityDto(
            depotId,
            depot.Name,
            date,
            containersPerHour,
            hourStart,
            hourEnd,
            dailyLimit,
            dailyBooked,
            slots);
    }

    public async Task ValidateAssignmentAsync(
        int depotId,
        DateOnly date,
        int slotNo,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        var dailyLimit = GetDailyLimit(depot.Capacity);

        var activeCount = await GetActiveSchedulesQuery(depotId, date, excludeScheduleId)
            .CountAsync(cancellationToken);

        if (activeCount >= dailyLimit)
        {
            throw new InvalidOperationException(
                $"Daily capacity reached for {depot.Name} on {date:yyyy-MM-dd} ({dailyLimit} returns).");
        }
    }

    public async Task ValidateHourlyAssignmentAsync(
        int depotId,
        DateOnly date,
        TimeOnly time,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        ScheduleAppointmentRules.ValidateEmptyReturnTime(time, depot.OperatingHourStart, depot.OperatingHourEnd);
        await ValidateAssignmentAsync(depotId, date, 0, excludeScheduleId, cancellationToken);

        var containersPerHour = Math.Max(1, depot.ContainersPerHour);
        var hourlyOnDate = (await GetHourlyActiveSchedulesQuery(depotId, date, excludeScheduleId)
                .ToListAsync(cancellationToken))
            .Where(s => !ScheduleAppointmentRules.IsLegacyDateOnly(s.Time))
            .ToList();
        var bookedInHour = hourlyOnDate.Count(s => s.Time.Hour == time.Hour);

        if (bookedInHour >= containersPerHour)
        {
            throw new InvalidOperationException(
                $"Hourly capacity reached for {depot.Name} on {date:yyyy-MM-dd} at {ScheduleAppointmentRules.FormatTimeLabel(time)} ({containersPerHour} per hour).");
        }
    }

    public static int GetDailyLimit(int depotCapacity)
        => Math.Min(depotCapacity, SchedulingConstants.MaxSlotsPerDay);

    private IQueryable<Domain.Entities.Schedule> GetActiveSchedulesQuery(
        int depotId,
        DateOnly date,
        int? excludeScheduleId)
    {
        var query = _db.Schedules
            .Include(s => s.PreAdvice)
            .Where(s =>
                s.DepotId == depotId &&
                s.Date == date &&
                s.Status != ScheduleStatus.NoShow &&
                s.Status != ScheduleStatus.WaitingSchedule);

        if (excludeScheduleId.HasValue)
            query = query.Where(s => s.Id != excludeScheduleId.Value);

        return query;
    }

    private IQueryable<Domain.Entities.Schedule> GetHourlyActiveSchedulesQuery(
        int depotId,
        DateOnly date,
        int? excludeScheduleId)
    {
        var query = _db.Schedules
            .Where(s =>
                s.DepotId == depotId &&
                s.Date == date &&
                s.SlotNo == 0 &&
                (s.Status == ScheduleStatus.Scheduled || s.Status == ScheduleStatus.Confirmed));

        if (excludeScheduleId.HasValue)
            query = query.Where(s => s.Id != excludeScheduleId.Value);

        return query;
    }
}
