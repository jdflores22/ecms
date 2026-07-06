namespace ECMS.Application.Interfaces;

public interface IUploadAccessService
{
    Task<bool> CanAccessPathAsync(
        string relativePath,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
