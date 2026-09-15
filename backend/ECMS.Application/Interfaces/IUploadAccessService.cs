namespace ECMS.Application.Interfaces;

public interface IUploadAccessService
{
    Task<bool> CanAccessPathAsync(
        string relativePath,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlySet<string>> FilterAccessiblePathsAsync(
        IReadOnlyList<string> relativePaths,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
