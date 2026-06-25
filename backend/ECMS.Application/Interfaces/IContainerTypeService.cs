using ECMS.Application.DTOs.ContainerCatalog;

namespace ECMS.Application.Interfaces;

public interface IContainerTypeService
{
    Task<IReadOnlyList<ContainerTypeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ContainerTypeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ContainerTypeDto> CreateAsync(CreateContainerTypeRequest request, int userId, CancellationToken cancellationToken = default);
    Task<ContainerTypeDto?> UpdateAsync(int id, UpdateContainerTypeRequest request, int userId, CancellationToken cancellationToken = default);
    Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default);
}
