using ECMS.Application.DTOs.ContainerInventory;

namespace ECMS.Application.Interfaces;

public interface IContainerInventoryService
{
    Task<ContainerInventoryResponseDto> GetInventoryAsync(
        int userId,
        string role,
        int? depotId,
        int? shippingLineId,
        string? complianceStatus,
        string? yardStatus,
        CancellationToken cancellationToken = default);

    Task<ManualYardInventoryEntryDto> CreateManualEntryAsync(
        CreateManualYardInventoryRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<BulkCreateManualYardInventoryResponse> BulkCreateManualEntriesAsync(
        BulkCreateManualYardInventoryRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteManualEntryAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task ApplyYardReleaseAsync(
        int shippingLineId,
        int depotId,
        string containerNoNormalized,
        int containerSizeId,
        int containerTypeId,
        int withdrawalRequestId,
        int withdrawalLineId,
        string withdrawalReferenceNo,
        int userId,
        CancellationToken cancellationToken = default);
}
