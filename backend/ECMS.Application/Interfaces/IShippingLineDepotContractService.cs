using ECMS.Application.DTOs.CyAllocation;

namespace ECMS.Application.Interfaces;

public interface IShippingLineDepotContractService
{
    Task<IReadOnlyList<ShippingLineDepotContractDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<ShippingLineDepotContractDto> CreateAsync(
        CreateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<ShippingLineDepotContractDto?> UpdateAsync(
        int id,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default);
}
