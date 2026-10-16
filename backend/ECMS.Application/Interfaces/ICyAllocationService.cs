using ECMS.Application.DTOs.CyAllocation;

namespace ECMS.Application.Interfaces;

public interface ICyAllocationService
{
    Task<IReadOnlyList<CyAllocationDto>> GetAllocationsAsync(
        int? shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CyAllocationDto>> GetAllocationsByDepotAsync(
        int? depotId,
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
        string? containerSizeForUnit = null,
        CancellationToken cancellationToken = default);

    Task<CyAllocationDto> UpdateContractAsync(
        int contractId,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<LogicteckCyAllocationFeedDto> GetLogicteckFeedAsync(
        int? shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<LogicteckCyAllocationFeedDto> GetLogicteckFeedForDepotAsync(
        int? depotId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<LogicteckPagedFeedDto<LogicteckBookingRowDto>> GetLogicteckBookingsFeedAsync(
        int? shippingLineId,
        int offset,
        int limit,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<LogicteckPagedFeedDto<LogicteckInventoryRowDto>> GetLogicteckInventoryFeedAsync(
        int? shippingLineId,
        int offset,
        int limit,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<LogicteckPagedFeedDto<LogicteckBookingRowDto>> GetLogicteckBookingsFeedForDepotAsync(
        int? depotId,
        int offset,
        int limit,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<LogicteckPagedFeedDto<LogicteckInventoryRowDto>> GetLogicteckInventoryFeedForDepotAsync(
        int? depotId,
        int offset,
        int limit,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
