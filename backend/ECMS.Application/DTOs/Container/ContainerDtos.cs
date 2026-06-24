namespace ECMS.Application.DTOs.Container;

public record ContainerDto(
    int Id,
    string ContainerNo,
    string Size,
    string Type,
    int ShippingLineId,
    string ShippingLineName);

public record CreateContainerRequest(
    string ContainerNo,
    string Size,
    string Type,
    int ShippingLineId);

public record UpdateContainerRequest(
    string ContainerNo,
    string Size,
    string Type,
    int ShippingLineId);
