namespace ECMS.Application.DTOs.QR;

public record QrPayloadDto(
    string BookingId,
    string ContainerNo,
    string ShippingLine,
    string Depot,
    string ScheduleDate,
    string ScheduleTime,
    string Trucker,
    string? ValidateUrl = null,
    string? LookupUrl = null,
    string? DossierUrl = null,
    string? PreAdviceReference = null,
    int? IcsTruckerId = null,
    string? IcsTruckerUsername = null,
    int? IcsPreAdviceId = null,
    int? IcsScheduleId = null);

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
    bool IsRetrieved,
    LogicteckTransferLinkDto? TransferLink = null);

/// <summary>Permanent ICS ↔ LOGICTECK link for a return — store on LOGICTECK side and re-use for every API call.</summary>
public record LogicteckTransferLinkDto(
    string TransferReference,
    int IcsTruckerId,
    string? IcsTruckerUsername,
    string IcsTruckerName,
    int IcsPreAdviceId,
    string IcsPreAdviceReference,
    int IcsScheduleId,
    int IcsQrBookingId,
    string LookupUrl,
    string DossierUrl,
    string ValidateUrl);

public record LogicteckDossierDocumentDto(
    string? Category,
    string? CategoryLabel,
    string? Comment,
    string FileName,
    string ContentType,
    long FileSize,
    string Url);

public record LogicteckDossierPreAdviceDto(
    int Id,
    string ReferenceNo,
    string Status,
    string TruckerName,
    string? TruckerUsername,
    int IcsTruckerId,
    string ShippingLineName,
    string ContainerNo,
    string ContainerSize,
    string ContainerType,
    string? Remarks,
    string? ComplianceRemarks,
    DateTime CreatedAt,
    bool HasDamageReport);

public record LogicteckDossierScheduleDto(
    int Id,
    string ReferenceNo,
    string DepotName,
    string ScheduledDate,
    string ScheduledTime,
    int SlotNo,
    string Status,
    string? TruckerName);

public record LogicteckDossierQrDto(
    int BookingId,
    string QrCode,
    DateTime GeneratedAt,
    string LogicteckStatus,
    bool IsUsed,
    DateTime? LogicteckBookedAt,
    string? QrImageBase64);

public record LogicteckBookingDossierResponse(
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
    bool IsRetrieved,
    LogicteckDossierPreAdviceDto? PreAdvice,
    LogicteckDossierScheduleDto? Schedule,
    LogicteckDossierQrDto? QrBooking,
    IReadOnlyList<LogicteckDossierDocumentDto> Documents,
    LogicteckTransferLinkDto? TransferLink = null);

public record BookLogicteckResponse(
    bool Success,
    string Message,
    QrBookingDto? Booking,
    string? ExternalReference,
    string? PortalUrl);
