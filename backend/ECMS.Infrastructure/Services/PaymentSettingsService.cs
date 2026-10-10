using ECMS.Application;
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
    private readonly INotificationService _notifications;
    private readonly IMemoryCache _cache;
    private readonly PayMongoOptions _payMongoOptions;

    public PaymentSettingsService(
        IEcmsDbContext db,
        IAuditService auditService,
        INotificationService notifications,
        IMemoryCache cache,
        IOptions<PayMongoOptions> payMongoOptions)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
        _cache = cache;
        _payMongoOptions = payMongoOptions.Value;
    }

    public async Task<PaymentSettingsDto> GetAsync(CancellationToken cancellationToken = default)
        => await MapDtoAsync(cancellationToken);

    public async Task<decimal> GetReturnFeeAmountAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        await SyncPilotStateAsync(settings, cancellationToken);
        return GetEffectiveReturnFee(settings);
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
        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        await SyncPilotStateAsync(settings, cancellationToken);

        if (IsPilotActive(settings))
            throw new InvalidOperationException(
                "PayMongo and manual proof upload cannot be changed while pilot testing is active.");

        if (payMongoEnabled && !allowProofUpload && !IsPayMongoConfigured())
            throw new InvalidOperationException("Configure PayMongo API keys before disabling proof upload.");

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

    public async Task<PaymentSettingsDto> UpdatePilotTestingSettingsAsync(
        bool pilotTestingEnabled,
        int durationDays,
        int adminUserId,
        CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        await SyncPilotStateAsync(settings, cancellationToken);

        if (pilotTestingEnabled)
        {
            if (durationDays < 1 || durationDays > 365)
                throw new InvalidOperationException("Pilot duration must be between 1 and 365 days.");

            var endsAt = PhilippinesTime.UtcNow.AddDays(durationDays);
            settings.PilotTestingEnabled = true;
            settings.PilotTestingDurationDays = durationDays;
            settings.PilotTestingEndsAtUtc = endsAt;
            settings.PilotNotified3DaysBefore = false;
            settings.PilotNotified1DayBefore = false;
            settings.PayMongoEnabled = false;
            settings.AllowProofUpload = false;
        }
        else
        {
            await EndPilotTestingAsync(settings, payMongoOnAfterEnd: IsPayMongoConfigured(), cancellationToken);
        }

        settings.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(settings);
        await _db.SaveChangesAsync(cancellationToken);
        InvalidateCache();

        await _auditService.LogAsync(
            adminUserId,
            "Update",
            "PaymentSettings",
            pilotTestingEnabled
                ? $"Pilot testing on for {durationDays} day(s), ends {settings.PilotTestingEndsAtUtc:yyyy-MM-dd} UTC"
                : "Pilot testing turned off",
            cancellationToken);

        if (pilotTestingEnabled)
        {
            var truckerIds = await NotificationService.TruckerIdsAsync(_db, cancellationToken);
            await _notifications.NotifyUsersAsync(
                truckerIds,
                "Pilot testing — pre-forecast fee is ₱0",
                $"For the next {durationDays} day(s), complete pre-forecast payment at ₱0 while we pilot ICS. PayMongo checkout is paused during this period.",
                "Payment",
                "/trucker/payments",
                adminUserId,
                null,
                cancellationToken);
        }

        return MapToDto(settings);
    }

    public async Task ProcessPilotTestingLifecycleAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken, bypassCache: true);
        if (!settings.PilotTestingEnabled || settings.PilotTestingEndsAtUtc is null)
            return;

        var daysLeft = GetPilotDaysRemaining(settings);
        if (daysLeft is null)
        {
            await SyncPilotStateAsync(settings, cancellationToken);
            return;
        }

        if (daysLeft <= 3 && daysLeft > 1 && !settings.PilotNotified3DaysBefore)
        {
            await NotifyPilotCountdownAsync(settings, daysLeft.Value, cancellationToken);
            settings.PilotNotified3DaysBefore = true;
            _db.Update(settings);
            await _db.SaveChangesAsync(cancellationToken);
            InvalidateCache();
        }
        else if (daysLeft == 1 && !settings.PilotNotified1DayBefore)
        {
            await NotifyPilotCountdownAsync(settings, 1, cancellationToken);
            settings.PilotNotified1DayBefore = true;
            _db.Update(settings);
            await _db.SaveChangesAsync(cancellationToken);
            InvalidateCache();
        }

        await SyncPilotStateAsync(settings, cancellationToken);
    }

    public async Task<ReturnPaymentOptionsDto> GetReturnPaymentOptionsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        await SyncPilotStateAsync(settings, cancellationToken);
        var pilotActive = IsPilotActive(settings);
        return new ReturnPaymentOptionsDto(
            pilotActive ? false : settings.PayMongoEnabled,
            pilotActive ? false : settings.AllowProofUpload,
            IsPayMongoConfigured(),
            pilotActive,
            GetEffectiveReturnFee(settings),
            GetPilotDaysRemaining(settings),
            settings.PilotTestingEndsAtUtc);
    }

    private async Task<PaymentSettingsDto> MapDtoAsync(CancellationToken cancellationToken)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        await SyncPilotStateAsync(settings, cancellationToken);
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
    {
        var pilotActive = IsPilotActive(settings);
        return new(
            settings.ReturnFeeAmount,
            settings.DemurrageFeeAmount,
            settings.DetentionFeeAmount,
            settings.PayMongoEnabled,
            settings.AllowProofUpload,
            IsPayMongoConfigured(),
            pilotActive,
            settings.PilotTestingEnabled,
            settings.PilotTestingDurationDays,
            GetPilotDaysRemaining(settings),
            settings.PilotTestingEndsAtUtc,
            GetEffectiveReturnFee(settings),
            settings.UpdatedAt);
    }

    private bool IsPayMongoConfigured()
    {
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PAYMONGO_SECRET_KEY")))
            return true;
        return !string.IsNullOrWhiteSpace(_payMongoOptions.SecretKey);
    }

    private static bool IsPilotActive(PaymentSettings settings) =>
        settings.PilotTestingEnabled
        && settings.PilotTestingEndsAtUtc is not null
        && settings.PilotTestingEndsAtUtc > PhilippinesTime.UtcNow;

    private static decimal GetEffectiveReturnFee(PaymentSettings settings) =>
        IsPilotActive(settings) ? 0m : settings.ReturnFeeAmount;

    private static int? GetPilotDaysRemaining(PaymentSettings settings)
    {
        if (!settings.PilotTestingEnabled || settings.PilotTestingEndsAtUtc is null)
            return null;
        var remaining = settings.PilotTestingEndsAtUtc.Value - PhilippinesTime.UtcNow;
        if (remaining <= TimeSpan.Zero)
            return 0;
        return (int)Math.Ceiling(remaining.TotalDays);
    }

    private async Task SyncPilotStateAsync(PaymentSettings settings, CancellationToken cancellationToken)
    {
        if (!settings.PilotTestingEnabled || settings.PilotTestingEndsAtUtc is null)
            return;

        if (settings.PilotTestingEndsAtUtc > PhilippinesTime.UtcNow)
            return;

        await EndPilotTestingAsync(settings, payMongoOnAfterEnd: IsPayMongoConfigured(), cancellationToken);
        settings.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(settings);
        await _db.SaveChangesAsync(cancellationToken);
        InvalidateCache();
    }

    private async Task EndPilotTestingAsync(
        PaymentSettings settings,
        bool payMongoOnAfterEnd,
        CancellationToken cancellationToken)
    {
        if (!settings.PilotTestingEnabled)
            return;

        settings.PilotTestingEnabled = false;
        settings.PilotTestingEndsAtUtc = null;
        settings.PilotNotified3DaysBefore = false;
        settings.PilotNotified1DayBefore = false;
        settings.PayMongoEnabled = payMongoOnAfterEnd;
        settings.AllowProofUpload = false;

        var fee = settings.ReturnFeeAmount;
        var truckerIds = await NotificationService.TruckerIdsAsync(_db, cancellationToken);
        await _notifications.NotifyUsersAsync(
            truckerIds,
            "Pilot testing ended — pre-forecast fee applies",
            $"The ₱0 pilot period has ended. Pre-forecast payment is now ₱{fee:N0}. Pay online via PayMongo when you file returns.",
            "Payment",
            "/trucker/payments",
            null,
            null,
            cancellationToken);
    }

    private async Task NotifyPilotCountdownAsync(
        PaymentSettings settings,
        int daysLeft,
        CancellationToken cancellationToken)
    {
        var truckerIds = await NotificationService.TruckerIdsAsync(_db, cancellationToken);
        var fee = settings.ReturnFeeAmount;
        await _notifications.NotifyUsersAsync(
            truckerIds,
            daysLeft == 1 ? "Pilot testing ends tomorrow" : $"Pilot testing — {daysLeft} days left",
            daysLeft == 1
                ? $"Tomorrow the ₱0 pilot ends. After that, pre-forecast fee will be ₱{fee:N0} (PayMongo checkout)."
                : $"About {daysLeft} day(s) left in the ₱0 pilot. Plan for ₱{fee:N0} pre-forecast fee after the pilot ends.",
            "Payment",
            "/trucker/payments",
            null,
            null,
            cancellationToken);
    }
}
