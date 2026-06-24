namespace ECMS.Application.DTOs.QR;

public record QrPayloadDto(
    string BookingId,
    string ContainerNo,
    string ShippingLine,
    string Depot,
    string ScheduleDate,
    string ScheduleTime,
    string Trucker);

public record QrBookingDto(
    int Id,
    int ScheduleId,
    string QRCode,
    QrPayloadDto Payload,
    DateTime GeneratedAt,
    bool IsUsed);

public record ValidateQrRequest(string QrCode);

public record ValidateQrResponse(
    bool Valid,
    string? ContainerNo,
    string? ScheduledDate,
    string? ScheduledTime,
    string? Depot);
