using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.Schedule;

public record ScheduleDto(
    int Id,
    int PreAdviceId,
    string ReferenceNo,
    int DepotId,
    string DepotName,
    DateOnly Date,
    TimeOnly Time,
    int SlotNo,
    ScheduleStatus Status,
    int? TruckerId,
    string? TruckerName);

public record CreateScheduleRequest(
    int PreAdviceId,
    int DepotId,
    DateOnly Date,
    TimeOnly Time,
    int SlotNo,
    int? TruckerId);

public record UpdateScheduleRequest(
    DateOnly Date,
    TimeOnly Time,
    int SlotNo,
    ScheduleStatus Status,
    int? TruckerId);
