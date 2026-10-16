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
    bool IsLogicteck,
    string? LogicteckIcsBaseUrl,
    string? LogicteckAllocationsUrl,
    string? LogicteckBookingsUrl,
    string? LogicteckInventoryUrl);

public record CreateDepotRequest(
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsLogicteck = false,
    string? LogicteckIcsBaseUrl = null,
    string? LogicteckAllocationsUrl = null,
    string? LogicteckBookingsUrl = null,
    string? LogicteckInventoryUrl = null);

public record UpdateDepotRequest(
    string Name,
    string Address,
    int Capacity,
    int ContainersPerHour,
    int OperatingHourStart,
    int OperatingHourEnd,
    bool IsActive,
    bool IsLogicteck = false,
    string? LogicteckIcsBaseUrl = null,
    string? LogicteckAllocationsUrl = null,
    string? LogicteckBookingsUrl = null,
    string? LogicteckInventoryUrl = null);
