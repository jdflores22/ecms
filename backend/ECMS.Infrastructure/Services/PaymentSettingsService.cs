using ECMS.Application.DTOs.Payment;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ECMS.Infrastructure.Services;

public class PaymentSettingsService : IPaymentSettingsService
{
    private const int SettingsRowId = 1;
    private const string SettingsCacheKey = "payment-settings";
    private static readonly TimeSpan SettingsCacheDuration = TimeSpan.FromMinutes(5);

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly IMemoryCache _cache;

    public PaymentSettingsService(IEcmsDbContext db, IAuditService auditService, IMemoryCache cache)
    {
        _db = db;
        _auditService = auditService;
        _cache = cache;
    }

    public Task<PaymentSettingsDto> GetAsync(CancellationToken cancellationToken = default)
        => MapDtoAsync(cancellationToken);

    public async Task<decimal> GetReturnFeeAmountAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        return settings.ReturnFeeAmount;
    }

    public async Task<decimal> GetDemurrageFeeAmountAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        return settings.DemurrageFeeAmount;
    }

    public async Task<decimal> GetDetentionFeeAmountAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        return settings.DetentionFeeAmount;
    }

    public async Task<PaymentSettingsDto> UpdateDemurrageFeesAsync(
        decimal demurrageFeeAmount,
        decimal detentionFeeAmount,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        ValidateFee(demurrageFeeAmount, "Demurrage fee");
        ValidateFee(detentionFeeAmount, "Detention fee");

        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        settings.DemurrageFeeAmount = demurrageFeeAmount;
        settings.DetentionFeeAmount = detentionFeeAmount;
        settings.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(settings);
        await _db.SaveChangesAsync(cancellationToken);
        InvalidateCache();

        await _auditService.LogAsync(
            adminUserId,
            "Update",
            "PaymentSettings",
            $"Demurrage ₱{demurrageFeeAmount:N0}, Detention ₱{detentionFeeAmount:N0}",
            cancellationToken);

        return MapToDto(settings);
    }

    private static void ValidateFee(decimal amount, string label)
    {
        if (amount <= 0)
            throw new InvalidOperationException($"{label} must be greater than zero.");
        if (amount > 10_000_000)
            throw new InvalidOperationException($"{label} exceeds the allowed maximum.");
    }

    public async Task<PaymentSettingsDto> UpdateReturnFeeAsync(
        decimal returnFeeAmount,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (returnFeeAmount <= 0)
            throw new InvalidOperationException("Return payment fee must be greater than zero.");

        if (returnFeeAmount > 10_000_000)
            throw new InvalidOperationException("Return payment fee exceeds the allowed maximum.");

        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        settings.ReturnFeeAmount = returnFeeAmount;
        settings.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(settings);
        await _db.SaveChangesAsync(cancellationToken);
        InvalidateCache();

        await _auditService.LogAsync(
            adminUserId,
            "Update",
            "PaymentSettings",
            $"Return fee set to ₱{returnFeeAmount:N0}",
            cancellationToken);

        return MapToDto(settings);
    }

    private async Task<PaymentSettingsDto> MapDtoAsync(CancellationToken cancellationToken)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        return MapToDto(settings);
    }

    private async Task<PaymentSettings> EnsureSettingsAsync(
        CancellationToken cancellationToken,
        bool bypassCache = false)
    {
        if (!bypassCache && _cache.TryGetValue(SettingsCacheKey, out PaymentSettings? cached) && cached is not null)
            return cached;

        var settings = await _db.PaymentSettings.FirstOrDefaultAsync(s => s.Id == SettingsRowId, cancellationToken);
        if (settings is not null)
        {
            _cache.Set(SettingsCacheKey, settings, SettingsCacheDuration);
            return settings;
        }

        settings = new PaymentSettings
        {
            Id = SettingsRowId,
            ReturnFeeAmount = 5000m,
            DemurrageFeeAmount = 3500m,
            DetentionFeeAmount = 2500m,
            UpdatedAt = PhilippinesTime.UtcNow,
        };
        _db.Add(settings);
        await _db.SaveChangesAsync(cancellationToken);
        _cache.Set(SettingsCacheKey, settings, SettingsCacheDuration);
        return settings;
    }

    private void InvalidateCache() => _cache.Remove(SettingsCacheKey);

    private static PaymentSettingsDto MapToDto(PaymentSettings settings)
        => new(settings.ReturnFeeAmount, settings.DemurrageFeeAmount, settings.DetentionFeeAmount, settings.UpdatedAt);
}
