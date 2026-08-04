namespace ECMS.Application.DTOs.ContainerReleaseOrder;

public record ContainerReleaseOrderLineDto(
    int Id,
    int LineNo,
    string ContainerNumber,
    string Size,
    string Type,
    string Seal,
    string HaulerName,
    string PlateNo,
    string LineReferenceNo,
    string DemurrageValidUntil,
    int? ReturnEmptyToDepotId,
    string ReturnEmptyToName);

public record ContainerReleaseOrderDto(
    int Id,
    string ReferenceNo,
    int ShippingLineId,
    string ShippingLineName,
    string Status,
    string ConsigneeNotifyParty,
    string ShippingLineCarrier,
    string RegistryNumber,
    string CustomsOffice,
    string VesselVoyageNumber,
    string BlNumber,
    string BrokerName,
    string PortInstructions,
    string EmptyReturnNote,
    string? AuthorizedByName,
    string? AuthorizedByCompany,
    string? PreparedByName,
    string? Remarks,
    string? IssuedAt,
    string? IssuedByName,
    bool HasPdf,
    string CreatedAt,
    IReadOnlyList<ContainerReleaseOrderLineDto> Lines);

public record ContainerReleaseOrderLineInput(
    string ContainerNumber,
    string Size,
    string Type,
    string Seal,
    string HaulerName,
    string PlateNo,
    string? LineReferenceNo,
    string DemurrageValidUntil,
    int? ReturnEmptyToDepotId,
    string? ReturnEmptyToName);

public record CreateContainerReleaseOrderRequest(
    string ConsigneeNotifyParty,
    string? ShippingLineCarrier,
    string RegistryNumber,
    string CustomsOffice,
    string VesselVoyageNumber,
    string BlNumber,
    string BrokerName,
    string? PortInstructions,
    string? EmptyReturnNote,
    string? AuthorizedByName,
    string? AuthorizedByCompany,
    string? PreparedByName,
    string? Remarks,
    IReadOnlyList<ContainerReleaseOrderLineInput> Lines);

public record UpdateContainerReleaseOrderRequest(
    string ConsigneeNotifyParty,
    string? ShippingLineCarrier,
    string RegistryNumber,
    string CustomsOffice,
    string VesselVoyageNumber,
    string BlNumber,
    string BrokerName,
    string? PortInstructions,
    string? EmptyReturnNote,
    string? AuthorizedByName,
    string? AuthorizedByCompany,
    string? PreparedByName,
    string? Remarks,
    IReadOnlyList<ContainerReleaseOrderLineInput> Lines);
