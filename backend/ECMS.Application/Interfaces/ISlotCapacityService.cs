using ECMS.Application.DTOs.Schedule;

namespace ECMS.Application.Interfaces;

public interface ISlotCapacityService
{
    Task<SlotAvailabilityDto> GetAvailabilityAsync(
        int depotId,
        DateOnly date,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default);

    Task ValidateAssignmentAsync(
        int depotId,
        DateOnly date,
        int slotNo,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default);

    Task<HourlySlotAvailabilityDto> GetHourlyAvailabilityAsync(
        int depotId,
        DateOnly date,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default);

    Task ValidateHourlyAssignmentAsync(
        int depotId,
        DateOnly date,
        TimeOnly time,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default);
}
