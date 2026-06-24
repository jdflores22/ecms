using ECMS.Application.DTOs.Container;

namespace ECMS.Application.Interfaces;

public interface IContainerService
{
    Task<IReadOnlyList<ContainerDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ContainerDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ContainerDto> CreateAsync(CreateContainerRequest request, int userId, CancellationToken cancellationToken = default);
    Task<ContainerDto?> UpdateAsync(int id, UpdateContainerRequest request, int userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, int userId, CancellationToken cancellationToken = default);
}
