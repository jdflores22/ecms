using ECMS.Application.DTOs.User;

namespace ECMS.Application.Interfaces;

public interface IProfileService
{
    Task<ProfileDto?> GetAsync(int userId, CancellationToken cancellationToken = default);
    Task<ProfileDto?> UpdateAsync(int userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<ProfileDto?> UploadPhotoAsync(
        int userId,
        string relativePhotoPath,
        string contentRoot,
        CancellationToken cancellationToken = default);
    Task<ProfileDto?> RemovePhotoAsync(int userId, string contentRoot, CancellationToken cancellationToken = default);
}
