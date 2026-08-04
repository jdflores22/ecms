namespace ECMS.Application.DTOs.ContainerReleaseOrder;

public record CroEdoLinkLineDto(
    int LineNo,
    string ContainerNumber,
    string Size,
    string Type,
    string DemurrageValidUntil,
    string ReturnEmptyTo);

public record CroEdoLinkDto(
    int Id,
    string ReferenceNo,
    string TokenHash,
    int ShippingLineId,
    string ShippingLineName,
    string ShippingLineCarrier,
    IReadOnlyList<CroEdoLinkLineDto> Lines);
