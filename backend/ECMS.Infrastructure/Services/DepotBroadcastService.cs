using ECMS.Application.DTOs.Depot;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class DepotBroadcastService : IDepotBroadcastService
{
    public const string NotificationCategory = "DepotBroadcast";

    private readonly IEcmsDbContext _db;
    private readonly INotificationService _notifications;
    private readonly IAuditService _audit;

    public DepotBroadcastService(
        IEcmsDbContext db,
        INotificationService notifications,
        IAuditService audit)
    {
        _db = db;
        _notifications = notifications;
        _audit = audit;
    }

    public async Task<DepotBroadcastDto> SendAsync(
        int actorUserId,
        string role,
        CreateDepotBroadcastRequest request,
        CancellationToken cancellationToken = default)
    {
        var subject = request.Subject?.Trim() ?? string.Empty;
        var message = request.Message?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(subject))
            throw new InvalidOperationException("Broadcast subject is required.");
        if (string.IsNullOrWhiteSpace(message))
            throw new InvalidOperationException("Broadcast message is required.");
        if (subject.Length > 128)
            throw new InvalidOperationException("Broadcast subject must be 128 characters or fewer.");
        if (message.Length > 4000)
            throw new InvalidOperationException("Broadcast message must be 4000 characters or fewer.");

        var depotId = await ResolveDepotIdAsync(actorUserId, role, cancellationToken)
            ?? throw new InvalidOperationException("Depot assignment is required to send broadcasts.");

        var recipients = await NotificationService.TruckerIdsForDepotAsync(_db, depotId, cancellationToken);
        if (recipients.Count == 0)
            throw new InvalidOperationException("No truckers are associated with this depot yet.");

        var actor = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == actorUserId, cancellationToken);

        var broadcast = new DepotBroadcast
        {
            DepotId = depotId,
            Subject = subject,
            Message = message,
            CreatedByUserId = actorUserId,
            RecipientCount = recipients.Count,
        };

        _db.Add(broadcast);
        await _db.SaveChangesAsync(cancellationToken);

        var notificationTitle = subject.StartsWith("Broadcast:", StringComparison.OrdinalIgnoreCase)
            ? subject
            : $"Broadcast: {subject}";

        await _notifications.NotifyUsersAsync(
            recipients,
            notificationTitle,
            message,
            NotificationCategory,
            "/trucker/notifications",
            actorUserId,
            cancellationToken: cancellationToken);

        _audit.QueueLog(actorUserId, "SendDepotBroadcast", "Depot", subject);
        await _db.SaveChangesAsync(cancellationToken);

        return ToDto(broadcast, actor.FullName ?? actor.Username);
    }

    public async Task<IReadOnlyList<DepotBroadcastDto>> GetHistoryAsync(
        int actorUserId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var depotId = await ResolveDepotIdAsync(actorUserId, role, cancellationToken)
            ?? throw new InvalidOperationException("Depot assignment is required.");

        return await _db.DepotBroadcasts
            .AsNoTracking()
            .Include(b => b.CreatedBy)
            .Where(b => b.DepotId == depotId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new DepotBroadcastDto(
                b.Id,
                b.Subject,
                b.Message,
                b.RecipientCount,
                b.CreatedBy.FullName ?? b.CreatedBy.Username,
                b.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    private async Task<int?> ResolveDepotIdAsync(int userId, string role, CancellationToken cancellationToken)
    {
        if (role == RoleNames.Administrator)
            return null;

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user?.DepotId;
    }

    private static DepotBroadcastDto ToDto(DepotBroadcast broadcast, string createdByName)
        => new(
            broadcast.Id,
            broadcast.Subject,
            broadcast.Message,
            broadcast.RecipientCount,
            createdByName,
            broadcast.CreatedAt);
}
