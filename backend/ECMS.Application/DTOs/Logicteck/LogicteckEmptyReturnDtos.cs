namespace ECMS.Application.DTOs.Logicteck;

public record LogicteckEmptyReturnSubmitRequest(
    string DriverName,
    string LicenseNumber,
    bool PlateNumberDifferent,
    string? PlateNumber,
    string ShippingLine,
    string? BlNumber,
    string ContainerSize,
    string ContainerType,
    string ContainerNumber,
    string ReturnDate,
    string ReturnTime,
    string? DamageDescription,
    string SubmitMode,
    string? IcsBookingReference,
    IReadOnlyList<LogicteckEmptyReturnDamageViewState> DamageViews);

public record LogicteckEmptyReturnDamageViewState(string View, bool IsDamaged);

public record LogicteckEmptyReturnFileAttachment(
    string Field,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Base64Content);

public record LogicteckEmptyReturnTransmissionPayload(
    string Source,
    string SubmitMode,
    string DriverName,
    string LicenseNumber,
    bool PlateNumberDifferent,
    string? PlateNumber,
    string ShippingLine,
    string? BlNumber,
    string ContainerSize,
    string ContainerType,
    string ContainerNumber,
    string ReturnDate,
    string ReturnTime,
    string? DamageDescription,
    string? IcsBookingReference,
    IReadOnlyList<LogicteckEmptyReturnDamageViewState> DamageViews,
    LogicteckEmptyReturnAttachmentMeta? PreAdviseAttachment,
    LogicteckEmptyReturnAttachmentMeta? DriversLicensePhoto,
    IReadOnlyList<LogicteckEmptyReturnDamagePhotoPayload> DamagePhotos);

public record LogicteckEmptyReturnAttachmentMeta(
    string FileName,
    string ContentType,
    long SizeBytes,
    string Base64Content);

public record LogicteckEmptyReturnDamagePhotoPayload(
    string View,
    bool IsDamaged,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Base64Content);

public record LogicteckEmptyReturnSubmitResponse(
    bool Success,
    string Message,
    string? ExternalReference,
    bool Transmitted,
    string? TargetUrl,
    LogicteckEmptyReturnPayloadPreview? PayloadPreview);

public record LogicteckEmptyReturnPayloadPreview(
    string SubmitMode,
    string DriverName,
    string LicenseNumber,
    string PlateNumber,
    string ShippingLine,
    string? BlNumber,
    string ContainerSize,
    string ContainerType,
    string ContainerNumber,
    string ReturnDate,
    string ReturnTime,
    string? DamageDescription,
    string? IcsBookingReference,
    IReadOnlyList<LogicteckEmptyReturnDamageViewState> DamageViews,
    string? PreAdviseAttachmentName,
    string? DriversLicensePhotoName,
    IReadOnlyList<LogicteckEmptyReturnPhotoPreview> DamagePhotos);

public record LogicteckEmptyReturnPhotoPreview(
    string View,
    bool IsDamaged,
    string FileName,
    long SizeBytes);
