using ECMS.Application.DTOs.Portal;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ECMS.Infrastructure.Services;

public class PortalSettingsService : IPortalSettingsService
{
    private const int SettingsRowId = 1;
    private const string SettingsCacheKey = "portal-settings";
    private static readonly TimeSpan SettingsCacheDuration = TimeSpan.FromMinutes(5);

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly IMemoryCache _cache;

    public PortalSettingsService(IEcmsDbContext db, IAuditService auditService, IMemoryCache cache)
    {
        _db = db;
        _auditService = auditService;
        _cache = cache;
    }

    public async Task<PortalSettingsDto> GetAsync(CancellationToken cancellationToken = default)
        => MapToDto(await EnsureSettingsAsync(cancellationToken));

    public async Task<bool> IsIcsCroEdoQrEnabledAsync(CancellationToken cancellationToken = default)
        => (await EnsureSettingsAsync(cancellationToken)).IcsCroEdoQrEnabled;

    public async Task<bool> IsSoaEnabledAsync(CancellationToken cancellationToken = default)
        => (await EnsureSettingsAsync(cancellationToken)).SoaEnabled;

    public async Task<bool> IsWithdrawalsEnabledAsync(CancellationToken cancellationToken = default)
        => (await EnsureSettingsAsync(cancellationToken)).WithdrawalsEnabled;

    public async Task<PortalSettingsDto> UpdateAsync(
        UpdatePortalSettingsRequest request,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        settings.IcsCroEdoQrEnabled = request.IcsCroEdoQrEnabled;
        settings.SoaEnabled = request.SoaEnabled;
        settings.WithdrawalsEnabled = request.WithdrawalsEnabled;
        settings.UpdatedAt = Domain.Common.PhilippinesTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        _cache.Set(SettingsCacheKey, settings, SettingsCacheDuration);

        _auditService.QueueLog(
            adminUserId,
            "Update",
            "PortalSettings",
            $"CRO QR={request.IcsCroEdoQrEnabled}; SOA={request.SoaEnabled}; Withdrawals={request.WithdrawalsEnabled}");

        return MapToDto(settings);
    }

    private async Task<PortalSettings> EnsureSettingsAsync(
        CancellationToken cancellationToken,
        bool bypassCache = false)
    {
        if (!bypassCache && _cache.TryGetValue(SettingsCacheKey, out PortalSettings? cached) && cached is not null)
            return cached;

        var settings = await _db.PortalSettings.FirstOrDefaultAsync(s => s.Id == SettingsRowId, cancellationToken);
        if (settings is not null)
        {
            _cache.Set(SettingsCacheKey, settings, SettingsCacheDuration);
            return settings;
        }

        settings = new PortalSettings
        {
            Id = SettingsRowId,
            IcsCroEdoQrEnabled = true,
            SoaEnabled = true,
            WithdrawalsEnabled = true,
            UpdatedAt = Domain.Common.PhilippinesTime.UtcNow,
        };
        _db.Add(settings);
        await _db.SaveChangesAsync(cancellationToken);
        _cache.Set(SettingsCacheKey, settings, SettingsCacheDuration);
        return settings;
    }

    private static PortalSettingsDto MapToDto(PortalSettings settings) =>
        new(settings.IcsCroEdoQrEnabled, settings.SoaEnabled, settings.WithdrawalsEnabled, settings.UpdatedAt);
}
