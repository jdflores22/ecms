namespace ECMS.Application.DTOs.Depot;

public record DepotDto(
    int Id,
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsActive);

public record CreateDepotRequest(
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd);

public record UpdateDepotRequest(
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsActive);
