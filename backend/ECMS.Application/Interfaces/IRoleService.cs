using ECMS.Application.DTOs.Role;

namespace ECMS.Application.Interfaces;

public interface IRoleService
{
    Task<IReadOnlyList<RoleCatalogDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<RoleAccessDto?> GetAccessForRoleAsync(string roleName, CancellationToken cancellationToken = default);
    Task<RoleCatalogDto?> UpdateAsync(string name, UpdateRoleRequest request, int actorId, CancellationToken cancellationToken = default);
}
