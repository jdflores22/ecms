namespace ECMS.Application.DTOs.QR;

public record QrPayloadDto(
    string BookingId,
    string ContainerNo,
    string ShippingLine,
    string Depot,
    string ScheduleDate,
    string ScheduleTime,
    string Trucker,
    string? ValidateUrl = null);

public record QrBookingDto(
    int Id,
    int ScheduleId,
    string QRCode,
    QrPayloadDto Payload,
    DateTime GeneratedAt,
    bool IsUsed,
    DateTime? LogicteckBookedAt,
    string LogicteckStatus);

public record ValidateQrRequest(string QrCode);

public record ValidateQrResponse(
    bool Valid,
    string? Message,
    string? BookingReference,
    string? ContainerNo,
    string? ShippingLine,
    string? Trucker,
    string? PreAdviceReference,
    string? ScheduledDate,
    string? ScheduledTime,
    string? Depot);

public record LogicteckBookingLookupResponse(
    bool Found,
    string? Message,
    string? BookingReference,
    string? ContainerNo,
    string? ShippingLine,
    string? Trucker,
    string? PreAdviceReference,
    string? ScheduledDate,
    string? ScheduledTime,
    string? Depot,
    bool IsBooked,
    bool IsRetrieved);

public record BookLogicteckResponse(
    bool Success,
    string Message,
    QrBookingDto? Booking,
    string? ExternalReference,
    string? PortalUrl);
