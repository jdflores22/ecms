namespace ECMS.Application.DTOs.Certificate;

public record CertificateVerificationResponseDto(
    bool Valid,
    string Status,
    string Message,
    string? DocumentTypeLabel,
    string? AtwNumber,
    string? ReferenceNo,
    string? ShippingLineName,
    string? DepotName,
    string? TruckerName,
    string? ContainerNo,
    string? ContainerSize,
    string? ContainerType,
    string? Destination,
    string? IssuedAt,
    bool IntegritySealed);
