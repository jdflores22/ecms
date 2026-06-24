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
}
