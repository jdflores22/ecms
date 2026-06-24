using ECMS.Application.DTOs.User;

namespace ECMS.Application.Interfaces;

public interface IUserService
{
    Task<IReadOnlyList<UserListItemDto>> GetTruckersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserAdminDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AdminLookupsDto> GetAdminLookupsAsync(CancellationToken cancellationToken = default);
    Task<UserAdminDto?> UpdateAsync(int id, UpdateUserRequest request, int actorId, CancellationToken cancellationToken = default);
}
