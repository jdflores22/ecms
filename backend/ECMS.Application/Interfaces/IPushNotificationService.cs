namespace ECMS.Application.Interfaces;

public interface IPushNotificationService
{
    bool IsConfigured { get; }

    Task RegisterTokenAsync(
        int userId,
        string token,
        string platform,
        string? deviceName = null,
        CancellationToken cancellationToken = default);

    Task UnregisterTokenAsync(
        int userId,
        string token,
        CancellationToken cancellationToken = default);

    Task SendToUsersAsync(
        IEnumerable<int> userIds,
        string title,
        string message,
        string category,
        string? linkPath = null,
        CancellationToken cancellationToken = default);
}
