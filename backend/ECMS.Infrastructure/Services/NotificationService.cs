using ECMS.Application.DTOs.Notification;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IEcmsDbContext _db;
    private readonly IPushNotificationService _push;

    public NotificationService(IEcmsDbContext db, IPushNotificationService push)
    {
        _db = db;
        _push = push;
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
}
