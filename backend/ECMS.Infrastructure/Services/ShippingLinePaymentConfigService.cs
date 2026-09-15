using ECMS.Application.DTOs.ShippingLine;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using ECMS.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class ShippingLinePaymentConfigService : IShippingLinePaymentConfigService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly PayMongoOptions _payMongoOptions;

    public ShippingLinePaymentConfigService(
        IEcmsDbContext db,
        IAuditService auditService,
        IOptions<PayMongoOptions> payMongoOptions)
    {
        _db = db;
        _auditService = auditService;
        _payMongoOptions = payMongoOptions.Value;
    }

    public async Task<ShippingLinePaymentConfigDto?> GetAsync(
        int shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!await CanManageAsync(shippingLineId, userId, role, cancellationToken))
            return null;

        var line = await _db.ShippingLines
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == shippingLineId, cancellationToken);
        if (line is null)
            return null;

        var config = await EnsureConfigAsync(shippingLineId, cancellationToken);
        return MapToDto(line, config);
    }

    public async Task<ShippingLinePaymentConfigDto?> UpdateAsync(
        int shippingLineId,
        UpdateShippingLinePaymentConfigRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (!await CanManageAsync(shippingLineId, userId, role, cancellationToken))
            return null;

        var line = await _db.ShippingLines.FirstOrDefaultAsync(s => s.Id == shippingLineId, cancellationToken);
        if (line is null)
            return null;

        if (request.PayMongoEnabled && !request.AllowProofUpload && string.IsNullOrWhiteSpace(request.PayMongoSecretKey))
        {
            var hasKey = await HasConfiguredSecretAsync(shippingLineId, cancellationToken);
            if (!hasKey)
                throw new InvalidOperationException("Configure a PayMongo secret key or allow proof upload as a fallback.");
        }

        var config = await EnsureConfigAsync(shippingLineId, cancellationToken);
        config.PayMongoEnabled = request.PayMongoEnabled;
        config.AllowProofUpload = request.AllowProofUpload;
        if (request.ClearPayMongoSecretKey)
            config.PayMongoSecretKey = null;
        else if (!string.IsNullOrWhiteSpace(request.PayMongoSecretKey))
            config.PayMongoSecretKey = request.PayMongoSecretKey.Trim();

        config.UpdatedAt = Domain.Common.PhilippinesTime.UtcNow;
        _db.Update(config);
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId,
            "Update",
            "ShippingLinePaymentConfig",
            $"{line.Code} · PayMongo={(request.PayMongoEnabled ? "on" : "off")}, proof={(request.AllowProofUpload ? "on" : "off")}",
            cancellationToken);

        return MapToDto(line, config);
    }

    public async Task<DemurragePaymentOptionsDto> GetDemurrageOptionsAsync(
        int shippingLineId,
        CancellationToken cancellationToken = default)
    {
        var config = await EnsureConfigAsync(shippingLineId, cancellationToken);
        var configured = await HasConfiguredSecretAsync(shippingLineId, cancellationToken);
        return new DemurragePaymentOptionsDto(config.PayMongoEnabled, config.AllowProofUpload, configured);
    }

    private async Task<bool> CanManageAsync(int shippingLineId, int userId, string role, CancellationToken cancellationToken)
    {
        if (role == RoleNames.Administrator)
            return true;

        if (role != RoleNames.ShippingLineEvaluator)
            return false;

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        return user?.ShippingLineId == shippingLineId;
    }

    private async Task<ShippingLinePaymentConfig> EnsureConfigAsync(
        int shippingLineId,
        CancellationToken cancellationToken)
    {
        var config = await _db.ShippingLinePaymentConfigs
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLineId, cancellationToken);

        if (config is not null)
            return config;

        config = new ShippingLinePaymentConfig
        {
            ShippingLineId = shippingLineId,
            PayMongoEnabled = false,
            AllowProofUpload = true,
            UpdatedAt = Domain.Common.PhilippinesTime.UtcNow,
        };
        _db.Add(config);
        await _db.SaveChangesAsync(cancellationToken);
        return config;
    }

    private async Task<bool> HasConfiguredSecretAsync(int shippingLineId, CancellationToken cancellationToken)
    {
        var config = await _db.ShippingLinePaymentConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLineId, cancellationToken);

        if (!string.IsNullOrWhiteSpace(config?.PayMongoSecretKey))
            return true;

        var env = Environment.GetEnvironmentVariable("PAYMONGO_SECRET_KEY");
        if (!string.IsNullOrWhiteSpace(env))
            return true;

        return !string.IsNullOrWhiteSpace(_payMongoOptions.SecretKey);
    }

    private ShippingLinePaymentConfigDto MapToDto(ShippingLine line, ShippingLinePaymentConfig config)
        => new(
            line.Id,
            line.Name,
            config.PayMongoEnabled,
            config.AllowProofUpload,
            !string.IsNullOrWhiteSpace(config.PayMongoSecretKey),
            HasPlatformSecret(),
            config.UpdatedAt);

    private bool HasPlatformSecret()
    {
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PAYMONGO_SECRET_KEY")))
            return true;
        return !string.IsNullOrWhiteSpace(_payMongoOptions.SecretKey);
    }
}
