namespace ECMS.Application.DTOs.Schedule;

public record SlotInfoDto(
    int SlotNo,
    bool Available,
    int? ScheduleId,
    string? ReferenceNo);

public record SlotAvailabilityDto(
    int DepotId,
    string DepotName,
    DateOnly Date,
    int MaxSlots,
    int DailyLimit,
    int BookedCount,
    IReadOnlyList<SlotInfoDto> Slots);
