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

    public async Task ValidateAssignmentAsync(
        int depotId,
        DateOnly date,
        int slotNo,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        var dailyLimit = GetDailyLimit(depot.Capacity);

        var active = await GetActiveSchedulesQuery(depotId, date, excludeScheduleId)
            .ToListAsync(cancellationToken);

        if (active.Count >= dailyLimit)
        {
            throw new InvalidOperationException(
                $"Daily capacity reached for {depot.Name} on {date:yyyy-MM-dd} ({dailyLimit} returns).");
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
}
