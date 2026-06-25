namespace ECMS.Application.DTOs.CyAllocation;

public record CyAllocationBreakdownCellDto(
    string TypeCode,
    string TypeLabel,
    int ActiveReturns,
    decimal UsedTeu);

public record CyAllocationBreakdownRowDto(
    string SizeLabel,
    decimal TeuPerContainer,
    IReadOnlyList<CyAllocationBreakdownCellDto> Cells);

public record CyAllocationDto(
    int DepotId,
    string DepotName,
    string DepotAddress,
    int ShippingLineId,
    string ShippingLineName,
    int ContractTeu,
    decimal UsedTeu,
    decimal AvailableTeu,
    int ActiveReturns,
    bool HasCapacity,
    IReadOnlyList<CyAllocationBreakdownRowDto> Breakdown);

public record CyAllocationForApprovalDto(
    int PreAdviceId,
    string ReferenceNo,
    decimal RequestedTeu,
    string ContainerNo,
    string ContainerSize,
    IReadOnlyList<CyAllocationDto> Allocations);

public record ShippingLineDepotContractDto(
    int Id,
    int ShippingLineId,
    string ShippingLineName,
    int DepotId,
    string DepotName,
    int ContractTeu,
    decimal UsedTeu,
    decimal AvailableTeu,
    bool IsActive);

public record CreateShippingLineDepotContractRequest(int ShippingLineId, int DepotId, int ContractTeu);

public record UpdateShippingLineDepotContractRequest(int ContractTeu, bool IsActive);
