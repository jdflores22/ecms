using ECMS.Application.DTOs.Schedule;

namespace ECMS.Application.Interfaces;

public interface IScheduleService
{
    Task<IReadOnlyList<ScheduleDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<ScheduleDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<ScheduleDto?> GetByPreAdviceIdAsync(int preAdviceId, int userId, string role, CancellationToken cancellationToken = default);
    Task<ScheduleDto> CreateAsync(CreateScheduleRequest request, int actorUserId, CancellationToken cancellationToken = default);
    Task<ScheduleDto?> UpdateAsync(int id, UpdateScheduleRequest request, int actorUserId, CancellationToken cancellationToken = default);
    Task<SlotAvailabilityDto> GetSlotAvailabilityAsync(
        int depotId,
        DateOnly date,
        int? excludeScheduleId = null,
        CancellationToken cancellationToken = default);
}
