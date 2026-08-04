namespace ECMS.Application.DTOs.ContainerReleaseOrder;

public record CroEdoVerificationLineDto(
    int LineNo,
    string ContainerNumber,
    string Size,
    string Type,
    string Seal,
    string HaulerName,
    string PlateNo,
    string DemurrageValidUntil,
    string ReturnEmptyTo);

public record CroEdoVerificationResponseDto(
    bool Valid,
    string Status,
    string Message,
    string? ReferenceNo,
    string? DocumentStatus,
    int? ShippingLineId,
    string? ShippingLineName,
    string? ConsigneeNotifyParty,
    string? BlNumber,
    string? VesselVoyageNumber,
    string? BrokerName,
    string? IssuedAt,
    IReadOnlyList<CroEdoVerificationLineDto>? Lines);
