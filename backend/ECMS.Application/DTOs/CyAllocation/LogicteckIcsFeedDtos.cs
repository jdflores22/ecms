namespace ECMS.Application.DTOs.CyAllocation;

public record LogicteckPagedFeedDto<T>(
    string Yard,
    DateTimeOffset GeneratedAt,
    int Total,
    int Offset,
    int Limit,
    int? NextOffset,
    IReadOnlyList<T> Items);

public record LogicteckBookingContainerDto(string Number, string Status);

public record LogicteckBookingShippingLineDto(string Code, string FullName);

public record LogicteckBookingActivityDto(string Status, DateTimeOffset At);

public record LogicteckBookingRowDto(
    string Id,
    string Reference,
    string Type,
    string Status,
    LogicteckBookingShippingLineDto ShippingLine,
    string? BlNumber,
    string ContainerSize,
    string ContainerType,
    int Quantity,
    IReadOnlyList<LogicteckBookingContainerDto> Containers,
    string? Date,
    string? TimeSlot,
    string? TruckingCompany,
    string? PlateNumber,
    bool IsVerified,
    DateTimeOffset? CreatedAt,
    DateTimeOffset? UpdatedAt,
    LogicteckBookingActivityDto? LastActivity);

public record LogicteckInventoryShippingLineDto(string Code, string FullName);

public record LogicteckInventoryRepairDto(bool MnrComplete);

public record LogicteckInventoryRowDto(
    string Id,
    string ContainerNumber,
    LogicteckInventoryShippingLineDto ShippingLine,
    string ContainerSize,
    string ContainerType,
    string? Class,
    int Teu,
    bool InYard,
    DateTimeOffset? GateInAt,
    string? EirNumber,
    string? Condition,
    string? Cleanliness,
    string Status,
    LogicteckInventoryRepairDto? Repair,
    string? TruckingCompany,
    string? PlateNumber,
    string? BookingId);
