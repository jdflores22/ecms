using ECMS.Application.DTOs.DemurrageDetentionRate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class DemurrageDetentionRateService : IDemurrageDetentionRateService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly IPaymentSettingsService _paymentSettings;

    public DemurrageDetentionRateService(
        IEcmsDbContext db,
        IAuditService auditService,
        IPaymentSettingsService paymentSettings)
    {
        _db = db;
        _auditService = auditService;
        _paymentSettings = paymentSettings;
    }

    public async Task<IReadOnlyList<DemurrageDetentionRateDto>> GetAllAsync(
        int userId,
        string role,
        int? shippingLineId,
        CancellationToken cancellationToken = default)
    {
        var scopedLineId = await ScopedShippingLineIdAsync(userId, role, cancellationToken);
        var query = QueryWithIncludes();

        if (role == RoleNames.ShippingLineEvaluator)
        {
            if (scopedLineId is null or 0)
                return Array.Empty<DemurrageDetentionRateDto>();
            query = query.Where(r => r.ShippingLineId == scopedLineId.Value);
        }
        else
        {
            return Array.Empty<DemurrageDetentionRateDto>();
        }

        var items = await query
            .OrderBy(r => r.ShippingLine.Name)
            .ThenByDescending(r => r.IsActive)
            .ThenByDescending(r => r.EffectiveFrom)
            .ThenByDescending(r => r.Id)
            .ToListAsync(cancellationToken);

        return items.Select(Map).ToList();
    }

    public async Task<DemurrageDetentionRateDto?> GetByIdAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await QueryWithIncludes().FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null)
            return null;
        if (!await CanAccessLineAsync(userId, role, entity.ShippingLineId, cancellationToken))
            return null;
        return Map(entity);
    }

    public async Task<DemurrageDetentionRateDto> CreateAsync(
        UpsertDemurrageDetentionRateRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await NormalizeShippingLineIdAsync(request.ShippingLineId, userId, role, cancellationToken);
        await ValidateRequestAsync(request, shippingLineId, excludeId: null, cancellationToken);

        var entity = new DemurrageDetentionRate
        {
            ShippingLineId = shippingLineId,
            DepotId = request.DepotId,
            ContainerSizeId = request.ContainerSizeId,
            DemurrageAmount = request.DemurrageAmount,
            DetentionAmount = request.DetentionAmount,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            IsActive = request.IsActive,
            UpdatedAt = PhilippinesTime.UtcNow,
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            userId,
            "Create",
            "DemurrageDetentionRate",
            await AuditDetailsAsync(entity, cancellationToken),
            cancellationToken);

        return Map(await QueryWithIncludes().FirstAsync(r => r.Id == entity.Id, cancellationToken));
    }

    public async Task<DemurrageDetentionRateDto?> UpdateAsync(
        int id,
        UpsertDemurrageDetentionRateRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.DemurrageDetentionRates.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null)
            return null;
        if (!await CanAccessLineAsync(userId, role, entity.ShippingLineId, cancellationToken))
            return null;

        var shippingLineId = await NormalizeShippingLineIdAsync(request.ShippingLineId, userId, role, cancellationToken);
        await ValidateRequestAsync(request, entity.ShippingLineId, excludeId: id, cancellationToken);

        entity.DepotId = request.DepotId;
        entity.ContainerSizeId = request.ContainerSizeId;
        entity.DemurrageAmount = request.DemurrageAmount;
        entity.DetentionAmount = request.DetentionAmount;
        entity.EffectiveFrom = request.EffectiveFrom;
        entity.EffectiveTo = request.EffectiveTo;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            userId,
            "Update",
            "DemurrageDetentionRate",
            await AuditDetailsAsync(entity, cancellationToken),
            cancellationToken);

        return Map(await QueryWithIncludes().FirstAsync(r => r.Id == entity.Id, cancellationToken));
    }

    public async Task<bool> DeactivateAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.DemurrageDetentionRates.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (entity is null)
            return false;
        if (!await CanAccessLineAsync(userId, role, entity.ShippingLineId, cancellationToken))
            return false;

        entity.IsActive = false;
        entity.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            userId,
            "Deactivate",
            "DemurrageDetentionRate",
            $"Id {entity.Id}",
            cancellationToken);
        return true;
    }

    public async Task<ResolvedDemurrageDetentionRateDto> ResolveAsync(
        int shippingLineId,
        int? depotId,
        int? containerSizeId,
        DateOnly? asOf,
        CancellationToken cancellationToken = default)
    {
        var onDate = asOf ?? PhilippinesTime.Today;
        var candidates = await _db.DemurrageDetentionRates
            .Include(r => r.ShippingLine)
            .Include(r => r.Depot)
            .Include(r => r.ContainerSize)
            .Where(r =>
                r.IsActive
                && r.ShippingLineId == shippingLineId
                && r.EffectiveFrom <= onDate
                && (r.EffectiveTo == null || r.EffectiveTo >= onDate)
                && (depotId == null ? r.DepotId == null : r.DepotId == null || r.DepotId == depotId)
                && (containerSizeId == null
                    ? r.ContainerSizeId == null
                    : r.ContainerSizeId == null || r.ContainerSizeId == containerSizeId))
            .ToListAsync(cancellationToken);

        var match = candidates
            .OrderByDescending(SpecificityScore)
            .ThenByDescending(r => r.EffectiveFrom)
            .ThenByDescending(r => r.Id)
            .FirstOrDefault();

        if (match is not null)
        {
            return new ResolvedDemurrageDetentionRateDto(
                match.DemurrageAmount,
                match.DetentionAmount,
                false,
                match.Id,
                FormatLabel(match));
        }

        var demurrage = await _paymentSettings.GetDemurrageFeeAmountAsync(cancellationToken);
        var detention = await _paymentSettings.GetDetentionFeeAmountAsync(cancellationToken);
        return new ResolvedDemurrageDetentionRateDto(
            demurrage,
            detention,
            true,
            null,
            "System default");
    }

    private IQueryable<DemurrageDetentionRate> QueryWithIncludes() =>
        _db.DemurrageDetentionRates
            .Include(r => r.ShippingLine)
            .Include(r => r.Depot)
            .Include(r => r.ContainerSize);

    private async Task<int> NormalizeShippingLineIdAsync(
        int requestedShippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
            if (!user.ShippingLineId.HasValue)
                throw new InvalidOperationException("Your account is not linked to a shipping line.");
            return user.ShippingLineId.Value;
        }

        throw new InvalidOperationException("You are not allowed to manage demurrage rates.");
    }

    private async Task<int?> ScopedShippingLineIdAsync(int userId, string role, CancellationToken cancellationToken)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new InvalidOperationException("You are not allowed to view demurrage rates.");

        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.ShippingLineId.HasValue)
            return 0;
        return user.ShippingLineId;
    }

    private async Task<bool> CanAccessLineAsync(
        int userId,
        string role,
        int shippingLineId,
        CancellationToken cancellationToken)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            return false;

        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
        return user.ShippingLineId == shippingLineId;
    }

    private async Task ValidateRequestAsync(
        UpsertDemurrageDetentionRateRequest request,
        int shippingLineId,
        int? excludeId,
        CancellationToken cancellationToken)
    {
        ValidateFee(request.DemurrageAmount, "Demurrage");
        ValidateFee(request.DetentionAmount, "Detention");

        if (request.EffectiveTo.HasValue && request.EffectiveTo.Value < request.EffectiveFrom)
            throw new InvalidOperationException("Effective-to date cannot be earlier than effective-from.");

        var lineExists = await _db.ShippingLines
            .AnyAsync(s => s.Id == shippingLineId && s.IsActive, cancellationToken);
        if (!lineExists)
            throw new InvalidOperationException("Shipping line was not found or is inactive.");

        if (request.DepotId.HasValue)
        {
            var depotOk = await _db.Depots.AnyAsync(d => d.Id == request.DepotId.Value && d.IsActive, cancellationToken);
            if (!depotOk)
                throw new InvalidOperationException("Depot was not found or is inactive.");
        }

        if (request.ContainerSizeId.HasValue)
        {
            var sizeOk = await _db.ContainerSizes
                .AnyAsync(s => s.Id == request.ContainerSizeId.Value && s.IsActive, cancellationToken);
            if (!sizeOk)
                throw new InvalidOperationException("Container size was not found or is inactive.");
        }

        var newFrom = request.EffectiveFrom;
        var newTo = request.EffectiveTo ?? DateOnly.MaxValue;

        var siblings = await _db.DemurrageDetentionRates
            .Where(r =>
                r.IsActive
                && r.ShippingLineId == shippingLineId
                && r.DepotId == request.DepotId
                && r.ContainerSizeId == request.ContainerSizeId
                && (!excludeId.HasValue || r.Id != excludeId.Value))
            .Select(r => new { r.Id, r.EffectiveFrom, r.EffectiveTo })
            .ToListAsync(cancellationToken);

        if (!request.IsActive)
            return;

        foreach (var sibling in siblings)
        {
            var siblingTo = sibling.EffectiveTo ?? DateOnly.MaxValue;
            var overlaps = newFrom <= siblingTo && sibling.EffectiveFrom <= newTo;
            if (overlaps)
                throw new InvalidOperationException(
                    "An active rule already exists for this shipping line, depot, and size with an overlapping date range.");
        }
    }

    private static void ValidateFee(decimal amount, string label)
    {
        if (amount <= 0)
            throw new InvalidOperationException($"{label} amount must be greater than zero.");
        if (amount > 10_000_000)
            throw new InvalidOperationException($"{label} amount exceeds the allowed maximum.");
    }

    private async Task<string> AuditDetailsAsync(DemurrageDetentionRate entity, CancellationToken cancellationToken)
    {
        var line = await _db.ShippingLines.AsNoTracking()
            .Where(s => s.Id == entity.ShippingLineId)
            .Select(s => s.Name)
            .FirstAsync(cancellationToken);
        var depot = entity.DepotId is null
            ? "All depots"
            : await _db.Depots.AsNoTracking()
                .Where(d => d.Id == entity.DepotId)
                .Select(d => d.Name)
                .FirstAsync(cancellationToken);
        var size = entity.ContainerSizeId is null
            ? "All sizes"
            : await _db.ContainerSizes.AsNoTracking()
                .Where(s => s.Id == entity.ContainerSizeId)
                .Select(s => s.Label)
                .FirstAsync(cancellationToken);

        return $"{line} · {depot} · {size} · demurrage ₱{entity.DemurrageAmount:N0} · detention ₱{entity.DetentionAmount:N0}";
    }

    private static int SpecificityScore(DemurrageDetentionRate rate) =>
        (rate.DepotId.HasValue ? 2 : 0) + (rate.ContainerSizeId.HasValue ? 1 : 0);

    private static string FormatLabel(DemurrageDetentionRate rate)
    {
        var depot = rate.Depot?.Name ?? "All depots";
        var size = rate.ContainerSize?.Label ?? "All sizes";
        var from = rate.EffectiveFrom.ToString("dd MMM yyyy");
        var dates = rate.EffectiveTo is null
            ? $"from {from}"
            : $"{from} – {rate.EffectiveTo.Value:dd MMM yyyy}";
        return $"{rate.ShippingLine.Name} · {depot} · {size} ({dates})";
    }

    private static DemurrageDetentionRateDto Map(DemurrageDetentionRate r) =>
        new(
            r.Id,
            r.ShippingLineId,
            r.ShippingLine.Name,
            r.DepotId,
            r.Depot?.Name,
            r.ContainerSizeId,
            r.ContainerSize?.Label,
            r.DemurrageAmount,
            r.DetentionAmount,
            r.EffectiveFrom.ToString("yyyy-MM-dd"),
            r.EffectiveTo?.ToString("yyyy-MM-dd"),
            r.IsActive,
            r.UpdatedAt,
            r.CreatedAt);
}
