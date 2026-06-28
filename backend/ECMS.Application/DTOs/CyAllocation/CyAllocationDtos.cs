namespace ECMS.Application.DTOs.CyAllocation;

public record CyAllocationBreakdownCellDto(
    string TypeCode,
    string TypeLabel,
    int PreAdvisedCount,
    decimal PreAdvisedTeu,
    int BookingCount,
    decimal BookingTeu);

public record CyAllocationBreakdownRowDto(
    string SizeLabel,
    decimal TeuPerContainer,
    int ContainerSizeId,
    int ContractCount,
    int PreAdvisedCount,
    int AvailableCount,
    int BookingCount,
    IReadOnlyList<CyAllocationBreakdownCellDto> Cells);

public record CyAllocationDto(
    int ContractId,
    int DepotId,
    string DepotName,
    string DepotAddress,
    int ShippingLineId,
    string ShippingLineCode,
    string ShippingLineName,
    int ContractTeu,
    int ContractCount,
    decimal PreAdvisedTeu,
    decimal BookingTeu,
    decimal AvailableTeu,
    int AvailableCount,
    int PreAdvisedCount,
    int BookingCount,
    bool HasCapacity,
    IReadOnlyList<CyAllocationBreakdownRowDto> Breakdown);

public record CyAllocationForApprovalDto(
    int PreAdviceId,
    string ReferenceNo,
    string ContainerNo,
    string ContainerSize,
    IReadOnlyList<CyAllocationDto> Allocations);

public record ShippingLineDepotContractSizeDto(
    int ContainerSizeId,
    string SizeLabel,
    decimal TeuPerContainer,
    int ContractCount,
    int PreAdvisedCount,
    int AvailableCount);

public record ShippingLineDepotContractDto(
    int Id,
    int ShippingLineId,
    string ShippingLineName,
    int DepotId,
    string DepotName,
    IReadOnlyList<ShippingLineDepotContractSizeDto> Sizes,
    bool IsActive);

public record ContractSizeAllocationInput(int ContainerSizeId, int ContractCount);

public record CreateShippingLineDepotContractRequest(
    int ShippingLineId,
    int DepotId,
    IReadOnlyList<ContractSizeAllocationInput> Sizes);

public record UpdateShippingLineDepotContractRequest(
    IReadOnlyList<ContractSizeAllocationInput> Sizes,
    bool IsActive);
