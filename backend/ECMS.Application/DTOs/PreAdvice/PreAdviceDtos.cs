using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.PreAdvice;

public record PreAdviceDto(
    int Id,
    string ReferenceNo,
    int TruckerId,
    string TruckerName,
    int ShippingLineId,
    string ShippingLineName,
    int ContainerId,
    string ContainerNo,
    string ContainerSize,
    string ContainerType,
    PreAdviceStatus Status,
    string? DemurrageValidUntil,
    string? Remarks,
    DateTime CreatedAt,
    string? ComplianceRemarks,
    DateTime? ComplianceRequestedAt,
    bool HasDamageReport,
    bool HasQrBooking,
    string? QrCode,
    int? QrBookingId,
    string? LogicteckStatus);

public record CreatePreAdviceRequest(
    int ShippingLineId,
    string ContainerNo,
    int ContainerSizeId,
    int ContainerTypeId,
    string? Remarks);

public record UpdatePreAdviceRequest(
    int ShippingLineId,
    string ContainerNo,
    int ContainerSizeId,
    int ContainerTypeId,
    string? Remarks);

public record CancelPreAdviceRequest(string? Reason);

public record CheckPreAdviceDuplicateRequest(
    string ContainerNo,
    int ContainerSizeId,
    int ContainerTypeId,
    int? ExcludePreAdviceId);

public record PreAdviceDuplicateCheckDto(
    bool IsDuplicate,
    string? ReferenceNo,
    PreAdviceStatus? Status,
    string? TruckerName);

public record ShippingLineLookupDto(int Id, string Name, string Code);

public record ContainerLookupDto(
    int Id,
    string ContainerNo,
    string Size,
    string Type,
    int ShippingLineId);

public record ContainerSizeLookupDto(int Id, string Label);

public record ContainerTypeLookupDto(int Id, string Code, string Label);

public record PreAdviceLookupsDto(
    IReadOnlyList<ShippingLineLookupDto> ShippingLines,
    IReadOnlyList<ContainerSizeLookupDto> ContainerSizes,
    IReadOnlyList<ContainerTypeLookupDto> ContainerTypes);

public record PreAdviceDocumentDto(
    int Id,
    int PreAdviceId,
    string? Category,
    string? CategoryLabel,
    string? Comment,
    string FileName,
    string FilePath,
    string ContentType,
    long FileSize,
    string UploadedByName,
    DateTime CreatedAt);
