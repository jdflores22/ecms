using ECMS.Application.DTOs.News;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class TruckerNewsService : ITruckerNewsService
{
    public const string NotificationCategory = "TruckerNews";

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _audit;
    private readonly INotificationService _notifications;

    public TruckerNewsService(
        IEcmsDbContext db,
        IAuditService audit,
        INotificationService notifications)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
    }

    public async Task<IReadOnlyList<TruckerNewsFeedItemDto>> GetPublishedFeedAsync(
        CancellationToken cancellationToken = default)
        => await _db.TruckerNews
            .AsNoTracking()
            .Where(n => n.IsPublished)
            .OrderByDescending(n => n.PublishedAt ?? n.CreatedAt)
            .Select(n => new TruckerNewsFeedItemDto(
                n.Id,
                n.Title,
                n.ImagePath,
                n.PublishedAt))
            .ToListAsync(cancellationToken);

    public async Task<TruckerNewsDetailDto?> GetPublishedByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var item = await _db.TruckerNews
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .FirstOrDefaultAsync(n => n.Id == id && n.IsPublished, cancellationToken);
        return item is null ? null : ToDetailDto(item);
    }

    public async Task<IReadOnlyList<TruckerNewsAdminDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
        => await _db.TruckerNews
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new TruckerNewsAdminDto(
                n.Id,
                n.Title,
                n.Body,
                n.ImagePath,
                n.IsPublished,
                n.PublishedAt,
                n.CreatedBy.FullName ?? n.CreatedBy.Username,
                n.CreatedAt))
            .ToListAsync(cancellationToken);

    public async Task<TruckerNewsAdminDto> CreateAsync(
        int actorUserId,
        CreateTruckerNewsRequest request,
        CancellationToken cancellationToken = default)
    {
        var (title, body) = ValidateContent(request.Title, request.Body);
        var item = new TruckerNews
        {
            Title = title,
            Body = body,
            CreatedByUserId = actorUserId,
        };
        _db.Add(item);
        await _db.SaveChangesAsync(cancellationToken);
        _audit.QueueLog(actorUserId, "CreateTruckerNews", "TruckerNews", title);
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAdminDtoAsync(item.Id, cancellationToken);
    }

    public async Task<TruckerNewsAdminDto> UpdateAsync(
        int id,
        UpdateTruckerNewsRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _db.TruckerNews.FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("News item not found.");
        var (title, body) = ValidateContent(request.Title, request.Body);
        var wasPublished = item.IsPublished;
        item.Title = title;
        item.Body = body;
        await _db.SaveChangesAsync(cancellationToken);
        if (wasPublished)
            await NotifyTruckersAsync(item, isUpdate: true, actorUserId: null, cancellationToken);
        return await GetAdminDtoAsync(id, cancellationToken);
    }

    public async Task<TruckerNewsAdminDto> PublishAsync(
        int id,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var item = await _db.TruckerNews.FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("News item not found.");
        if (string.IsNullOrWhiteSpace(item.ImagePath))
            throw new InvalidOperationException("Upload a cover image before publishing.");
        var wasPublished = item.IsPublished;
        item.IsPublished = true;
        item.PublishedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _audit.QueueLog(actorUserId, "PublishTruckerNews", "TruckerNews", item.Title);
        await _db.SaveChangesAsync(cancellationToken);
        if (!wasPublished)
            await NotifyTruckersAsync(item, isUpdate: false, actorUserId, cancellationToken);
        return await GetAdminDtoAsync(id, cancellationToken);
    }

    public async Task<TruckerNewsAdminDto> SetImageAsync(
        int id,
        string imagePath,
        string fileName,
        string contentType,
        long fileSize,
        CancellationToken cancellationToken = default)
    {
        var item = await _db.TruckerNews.FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("News item not found.");
        item.ImagePath = imagePath;
        item.ImageFileName = fileName;
        item.ImageContentType = contentType;
        item.ImageFileSize = fileSize;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAdminDtoAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _db.TruckerNews.FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw new InvalidOperationException("News item not found.");
        _db.Remove(item);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<TruckerNewsAdminDto> GetAdminDtoAsync(int id, CancellationToken cancellationToken)
    {
        var item = await _db.TruckerNews
            .AsNoTracking()
            .Include(n => n.CreatedBy)
            .FirstAsync(n => n.Id == id, cancellationToken);
        return ToAdminDto(item);
    }

    private static (string Title, string Body) ValidateContent(string? title, string? body)
    {
        var t = title?.Trim() ?? string.Empty;
        var b = body?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(t))
            throw new InvalidOperationException("Title is required.");
        if (string.IsNullOrWhiteSpace(b))
            throw new InvalidOperationException("Body is required.");
        if (t.Length > 128)
            throw new InvalidOperationException("Title must be 128 characters or fewer.");
        if (b.Length > 4000)
            throw new InvalidOperationException("Body must be 4000 characters or fewer.");
        return (t, b);
    }

    private async Task NotifyTruckersAsync(
        TruckerNews item,
        bool isUpdate,
        int? actorUserId,
        CancellationToken cancellationToken)
    {
        var truckers = await NotificationService.TruckerIdsAsync(_db, cancellationToken);
        if (truckers.Count == 0)
            return;

        var title = isUpdate ? $"Update: {item.Title}" : item.Title;
        var preview = item.Body.Length > 200 ? $"{item.Body[..200]}…" : item.Body;
        var linkPath = $"/trucker/news/{item.Id}";

        await _notifications.NotifyUsersAsync(
            truckers,
            title,
            preview,
            NotificationCategory,
            linkPath,
            actorUserId,
            cancellationToken: cancellationToken);
    }

    private static TruckerNewsDetailDto ToDetailDto(TruckerNews item)
        => new(
            item.Id,
            item.Title,
            item.Body,
            item.ImagePath,
            item.IsPublished,
            item.PublishedAt,
            item.CreatedBy.FullName ?? item.CreatedBy.Username,
            item.CreatedAt);

    private static TruckerNewsAdminDto ToAdminDto(TruckerNews item)
        => new(
            item.Id,
            item.Title,
            item.Body,
            item.ImagePath,
            item.IsPublished,
            item.PublishedAt,
            item.CreatedBy.FullName ?? item.CreatedBy.Username,
            item.CreatedAt);
}
