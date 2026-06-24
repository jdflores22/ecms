using ECMS.Domain.Entities;

using ECMS.Application.DTOs.Audit;
using ECMS.Application.DTOs.Notification;

namespace ECMS.Application.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    DateTime GetAccessTokenExpiry();
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}

public interface IAuditService
{
    Task LogAsync(int userId, string action, string module, string? details = null, CancellationToken cancellationToken = default);
    Task<AuditLogPageDto> QueryAsync(AuditLogQuery query, CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task NotifyUsersAsync(
        IEnumerable<int> userIds,
        string title,
        string message,
        string category,
        string? linkPath = null,
        int? actorUserId = null,
        string? referenceNo = null,
        CancellationToken cancellationToken = default);

    Task<NotificationPageDto> GetForUserAsync(
        int userId,
        int page,
        int pageSize,
        bool? unreadOnly,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default);

    Task<bool> MarkReadAsync(int userId, int notificationId, CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(int userId, CancellationToken cancellationToken = default);
}
