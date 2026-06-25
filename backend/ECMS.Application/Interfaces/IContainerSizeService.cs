using ECMS.Application.DTOs.ContainerCatalog;

namespace ECMS.Application.Interfaces;

public interface IContainerSizeService
{
    Task<IReadOnlyList<ContainerSizeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ContainerSizeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ContainerSizeDto> CreateAsync(CreateContainerSizeRequest request, int userId, CancellationToken cancellationToken = default);
    Task<ContainerSizeDto?> UpdateAsync(int id, UpdateContainerSizeRequest request, int userId, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default);
}
