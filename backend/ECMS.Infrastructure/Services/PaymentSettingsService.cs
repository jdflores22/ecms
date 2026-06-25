using ECMS.Application.DTOs.Payment;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class PaymentSettingsService : IPaymentSettingsService
{
    private const int SettingsRowId = 1;

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public PaymentSettingsService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public Task<PaymentSettingsDto> GetAsync(CancellationToken cancellationToken = default)
        => MapDtoAsync(cancellationToken);

    public async Task<decimal> GetReturnFeeAmountAsync(CancellationToken cancellationToken = default)
    {
        var settings = await EnsureSettingsAsync(cancellationToken);
        return settings.ReturnFeeAmount;
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

        var settings = await EnsureSettingsAsync(cancellationToken);
        settings.ReturnFeeAmount = returnFeeAmount;
        settings.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(settings);
        await _db.SaveChangesAsync(cancellationToken);

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

    private async Task<PaymentSettings> EnsureSettingsAsync(CancellationToken cancellationToken)
    {
        var settings = await _db.PaymentSettings.FirstOrDefaultAsync(s => s.Id == SettingsRowId, cancellationToken);
        if (settings is not null)
            return settings;

        settings = new PaymentSettings
        {
            Id = SettingsRowId,
            ReturnFeeAmount = 5000m,
            UpdatedAt = PhilippinesTime.UtcNow,
        };
        _db.Add(settings);
        await _db.SaveChangesAsync(cancellationToken);
        return settings;
    }

    private static PaymentSettingsDto MapToDto(PaymentSettings settings)
        => new(settings.ReturnFeeAmount, settings.UpdatedAt);
}
