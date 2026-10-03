using ECMS.Application.Configuration;
using ECMS.Application.DTOs.Notification;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using ECMS.Infrastructure.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IEcmsDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly IEmailService _emailService;
    private readonly EmailOptions _emailOptions;
    private readonly IcsAppOptions _appOptions;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IEcmsDbContext db,
        IPushNotificationService push,
        IEmailService emailService,
        IOptions<EmailOptions> emailOptions,
        IOptions<IcsAppOptions> appOptions,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _push = push;
        _emailService = emailService;
        _emailOptions = emailOptions.Value;
        _appOptions = appOptions.Value;
        _logger = logger;
    }

    public async Task NotifyUsersAsync(
        IEnumerable<int> userIds,
        string title,
        string message,
        string category,
        string? linkPath = null,
        int? actorUserId = null,
        string? referenceNo = null,
        CancellationToken cancellationToken = default)
    {
        var recipients = userIds
            .Where(id => id > 0 && id != actorUserId)
            .Distinct()
            .ToList();

        if (recipients.Count == 0)
            return;

        foreach (var userId in recipients)
        {
            _db.Add(new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Category = category,
                LinkPath = linkPath,
                ActorUserId = actorUserId,
                ReferenceNo = referenceNo,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        await _push.SendToUsersAsync(
            recipients,
            title,
            message,
            category,
            linkPath,
            cancellationToken);

        if (_emailOptions.Enabled && _emailOptions.SendInAppNotificationsByEmail)
            await TrySendNotificationEmailsAsync(recipients, title, message, linkPath, cancellationToken);
    }

    private async Task TrySendNotificationEmailsAsync(
        List<int> userIds,
        string title,
        string message,
        string? linkPath,
        CancellationToken cancellationToken)
    {
        var users = await _db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Email, u.FullName, u.Username })
            .ToListAsync(cancellationToken);

        var frontendBase = (_appOptions.PublicFrontendUrl ?? "").TrimEnd('/');
        var actionUrl = string.IsNullOrWhiteSpace(linkPath)
            ? null
            : linkPath.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                ? linkPath
                : $"{frontendBase}{(linkPath.StartsWith('/') ? linkPath : "/" + linkPath)}";

        foreach (var user in users)
        {
            if (string.IsNullOrWhiteSpace(user.Email) || !user.Email.Contains('@', StringComparison.Ordinal))
                continue;

            try
            {
                var displayName = user.FullName ?? user.Username;
                var (subject, html, plain) = SystemEmailTemplates.InAppNotification(displayName, title, message, actionUrl);
                await _emailService.SendAsync(user.Email, subject, html, plain, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send notification email to user {UserId}", user.Id);
            }
        }
    }

    public async Task<NotificationPageDto> GetForUserAsync(
        int userId,
        int page,
        int pageSize,
        bool? unreadOnly,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

        var query = _db.Notifications
            .Include(n => n.Actor)
            .Where(n => n.UserId == userId);

        if (unreadOnly == true)
            query = query.Where(n => !n.IsRead);

        var total = await query.CountAsync(cancellationToken);
        var unreadCount = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto(
                n.Id,
                n.Title,
                n.Message,
                n.Category,
                n.LinkPath,
                n.IsRead,
                n.CreatedAt,
                n.ReferenceNo,
                n.Actor != null ? (n.Actor.FullName ?? n.Actor.Username) : null))
            .ToListAsync(cancellationToken);

        return new NotificationPageDto(items, total, unreadCount, page, pageSize);
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default)
        => _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);

    public async Task<bool> MarkReadAsync(int userId, int notificationId, CancellationToken cancellationToken = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, cancellationToken);

        if (notification is null)
            return false;

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = PhilippinesTime.UtcNow;
            _db.Update(notification);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken cancellationToken = default)
    {
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count == 0)
            return;

        var now = PhilippinesTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
            _db.Update(n);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public static async Task<List<int>> EvaluatorIdsForShippingLineAsync(
        IEcmsDbContext db,
        int shippingLineId,
        CancellationToken cancellationToken = default)
    {
        return await db.Users
            .Include(u => u.Role)
            .Where(u =>
                u.Status == UserStatus.Active
                && u.Role.Name == RoleNames.ShippingLineEvaluator
                && u.ShippingLineId == shippingLineId)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);
    }

    public static async Task<List<int>> DepotPersonnelIdsAsync(
        IEcmsDbContext db,
        int depotId,
        CancellationToken cancellationToken = default)
    {
        return await db.Users
            .Include(u => u.Role)
            .Where(u =>
                u.Status == UserStatus.Active
                && u.Role.Name == RoleNames.DepotPersonnel
                && u.DepotId == depotId)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);
    }

    public static async Task<List<int>> AdministratorIdsAsync(
        IEcmsDbContext db,
        CancellationToken cancellationToken = default)
    {
        return await db.Users
            .Include(u => u.Role)
            .Where(u => u.Status == UserStatus.Active && u.Role.Name == RoleNames.Administrator)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);
    }

    public static async Task<List<int>> TruckerIdsAsync(
        IEcmsDbContext db,
        CancellationToken cancellationToken = default)
    {
        return await db.Users
            .Include(u => u.Role)
            .Where(u => u.Status == UserStatus.Active && (u.Role.Name == RoleNames.Trucker || u.Role.Name == RoleNames.Broker))
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);
    }

    public static async Task<List<int>> TruckerIdsForDepotAsync(
        IEcmsDbContext db,
        int depotId,
        CancellationToken cancellationToken = default)
    {
        var scheduleTruckerIds = db.Schedules
            .Where(s => s.DepotId == depotId && s.TruckerId != null)
            .Select(s => s.TruckerId!.Value);

        var withdrawalTruckerIds = db.WithdrawalRequests
            .Where(w => w.CurrentDepotId == depotId)
            .Select(w => w.TruckerId);

        var associatedIds = await scheduleTruckerIds
            .Union(withdrawalTruckerIds)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (associatedIds.Count == 0)
            return new List<int>();

        return await db.Users
            .Include(u => u.Role)
            .Where(u =>
                associatedIds.Contains(u.Id)
                && u.Status == UserStatus.Active
                && (u.Role.Name == RoleNames.Trucker || u.Role.Name == RoleNames.Broker))
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);
    }
}
