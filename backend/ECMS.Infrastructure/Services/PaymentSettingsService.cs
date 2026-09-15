using ECMS.Application.DTOs.Payment;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class PaymentSettingsService : IPaymentSettingsService
{
    private const int SettingsRowId = 1;
    private const string SettingsCacheKey = "payment-settings";
    private static readonly TimeSpan SettingsCacheDuration = TimeSpan.FromMinutes(5);

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly IMemoryCache _cache;
    private readonly PayMongoOptions _payMongoOptions;

    public PaymentSettingsService(
        IEcmsDbContext db,
        IAuditService auditService,
        IMemoryCache cache,
        IOptions<PayMongoOptions> payMongoOptions)
    {
        _db = db;
        _auditService = auditService;
        _cache = cache;
        _payMongoOptions = payMongoOptions.Value;
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

    public async Task<PaymentSettingsDto> UpdatePayMongoSettingsAsync(
        bool payMongoEnabled,
        bool allowProofUpload,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (payMongoEnabled && !allowProofUpload && !IsPayMongoConfigured())
            throw new InvalidOperationException("Configure PayMongo API keys before disabling proof upload.");

        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        settings.PayMongoEnabled = payMongoEnabled;
        settings.AllowProofUpload = allowProofUpload;
        settings.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(settings);
        await _db.SaveChangesAsync(cancellationToken);
        InvalidateCache();

        await _auditService.LogAsync(
            adminUserId,
            "Update",
            "PaymentSettings",
            $"PayMongo={(payMongoEnabled ? "on" : "off")}, proof upload={(allowProofUpload ? "on" : "off")}",
            cancellationToken);

        return MapToDto(settings);
    }

    public async Task<ReturnPaymentOptionsDto> GetReturnPaymentOptionsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        return new ReturnPaymentOptionsDto(
            settings.PayMongoEnabled,
            settings.AllowProofUpload,
            IsPayMongoConfigured());
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

    private PaymentSettingsDto MapToDto(PaymentSettings settings)
        => new(
            settings.ReturnFeeAmount,
            settings.DemurrageFeeAmount,
            settings.DetentionFeeAmount,
            settings.PayMongoEnabled,
            settings.AllowProofUpload,
            IsPayMongoConfigured(),
            settings.UpdatedAt);

    private bool IsPayMongoConfigured()
    {
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PAYMONGO_SECRET_KEY")))
            return true;
        return !string.IsNullOrWhiteSpace(_payMongoOptions.SecretKey);
    }
}
