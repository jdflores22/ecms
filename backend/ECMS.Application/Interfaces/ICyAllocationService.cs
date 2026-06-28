using ECMS.Application.DTOs.CyAllocation;

namespace ECMS.Application.Interfaces;

public interface ICyAllocationService
{
    Task<IReadOnlyList<CyAllocationDto>> GetAllocationsAsync(
        int? shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<CyAllocationForApprovalDto?> GetForApprovalAsync(
        int preAdviceId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task EnsureCapacityForApprovalAsync(
        int preAdviceId,
        int depotId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<CyAllocationDto> UpdateContractAsync(
        int contractId,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
