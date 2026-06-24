using ECMS.Application.DTOs.Depot;

namespace ECMS.Application.Interfaces;

public interface IDepotService
{
    Task<IReadOnlyList<DepotDto>> GetActiveAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DepotDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DepotDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DepotDto> CreateAsync(CreateDepotRequest request, int userId, CancellationToken cancellationToken = default);
    Task<DepotDto?> UpdateAsync(int id, UpdateDepotRequest request, int userId, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default);
}
