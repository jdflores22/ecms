using ECMS.Application.DTOs.Audit;
using ECMS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IEcmsDbContext _db;

    public AuditService(IEcmsDbContext db)
    {
        _db = db;
    }

    public void QueueLog(int userId, string action, string module, string? details = null)
    {
        _db.Add(new Domain.Entities.AuditLog
        {
            UserId = userId,
            Action = action,
            Module = module,
            Details = details,
        });
    }

    public async Task LogAsync(int userId, string action, string module, string? details = null, CancellationToken cancellationToken = default)
    {
        QueueLog(userId, action, module, details);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<AuditLogPageDto> QueryAsync(AuditLogQuery query, CancellationToken cancellationToken = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 200 ? 50 : query.PageSize;

        var logs = _db.AuditLogs.Include(a => a.User).AsQueryable();

        if (query.UserId.HasValue)
            logs = logs.Where(a => a.UserId == query.UserId);

        if (!string.IsNullOrWhiteSpace(query.Module))
            logs = logs.Where(a => a.Module == query.Module);

        if (!string.IsNullOrWhiteSpace(query.Action))
            logs = logs.Where(a => a.Action.Contains(query.Action));

        if (query.From.HasValue)
            logs = logs.Where(a => a.Timestamp >= query.From.Value);

        if (query.To.HasValue)
            logs = logs.Where(a => a.Timestamp <= query.To.Value);

        var total = await logs.CountAsync(cancellationToken);

        var items = await logs
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                a.User.Username,
                a.Action,
                a.Module,
                a.Details,
                a.Timestamp))
            .ToListAsync(cancellationToken);

        return new AuditLogPageDto(items, total, page, pageSize);
    }

    public async Task<IReadOnlyList<AuditLogDto>> QueryPreAdviceTrailAsync(
        string referenceNo,
        int? scheduleId = null,
        string? qrCode = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(referenceNo))
            return Array.Empty<AuditLogDto>();

        var refKey = referenceNo.Trim();
        var scheduleToken = scheduleId is > 0 ? $"Schedule {scheduleId.Value}" : null;
        var scheduleTokenAlt = scheduleId is > 0 ? $"schedule {scheduleId.Value}" : null;
        var qrKey = string.IsNullOrWhiteSpace(qrCode) ? null : qrCode.Trim();

        var modules = new[]
        {
            "PreForecast",
            "PreAdvice",
            "Evaluation",
            "Schedule",
            "Payment",
            "QR",
            "BookingConfirmationPdf",
            "LOGICTECK",
        };

        var logs = _db.AuditLogs
            .Include(a => a.User)
            .Where(a => modules.Contains(a.Module) && a.Details != null)
            .Where(a =>
                a.Details!.Contains(refKey)
                || (scheduleToken != null && a.Details.Contains(scheduleToken))
                || (scheduleTokenAlt != null && a.Details.Contains(scheduleTokenAlt))
                || (qrKey != null && a.Details.Contains(qrKey)));

        return await logs
            .OrderByDescending(a => a.Timestamp)
            .Take(200)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                a.User.Username,
                a.Action,
                a.Module,
                a.Details,
                a.Timestamp))
            .ToListAsync(cancellationToken);
    }
}
