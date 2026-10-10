namespace ECMS.Application.DTOs.Depot;

public record DepotDto(
    int Id,
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsActive,
    bool IsLogicteck);

public record CreateDepotRequest(
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsLogicteck = false);

public record UpdateDepotRequest(
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsActive,
    bool IsLogicteck = false);
