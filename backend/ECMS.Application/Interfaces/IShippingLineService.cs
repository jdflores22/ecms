using ECMS.Application.DTOs.ShippingLine;

namespace ECMS.Application.Interfaces;

public interface IShippingLineService
{
    Task<IReadOnlyList<ShippingLineDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ShippingLineDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ShippingLineDto> CreateAsync(CreateShippingLineRequest request, int userId, CancellationToken cancellationToken = default);
    Task<ShippingLineDto?> UpdateAsync(int id, UpdateShippingLineRequest request, int userId, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default);
}
