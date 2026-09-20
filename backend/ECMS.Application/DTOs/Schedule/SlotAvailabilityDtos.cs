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

public record HourlySlotInfoDto(
    TimeOnly Time,
    string TimeLabel,
    int MaxContainers,
    int BookedCount,
    bool IsAvailable);

public record HourlySlotAvailabilityDto(
    int DepotId,
    string DepotName,
    DateOnly Date,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    int DailyLimit,
    int DailyBookedCount,
    IReadOnlyList<HourlySlotInfoDto> Slots);
