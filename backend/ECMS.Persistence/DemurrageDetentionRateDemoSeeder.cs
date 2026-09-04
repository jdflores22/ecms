using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Persistence;

internal static class DemurrageDetentionRateDemoSeeder
{
    public const string SeedMarker = "SEED:DEMURRAGE-RATES";

    public static async Task SeedAsync(EcmsDbContext context, CancellationToken cancellationToken = default)
    {
        if (await context.DemurrageDetentionRatesSet.AnyAsync(cancellationToken))
            return;

        var lines = await context.ShippingLinesSet
            .Where(s => s.IsActive)
            .OrderBy(s => s.Id)
            .Take(2)
            .ToListAsync(cancellationToken);

        var primaryLine = lines.FirstOrDefault();
        if (primaryLine is null)
            return;

        var depot = await context.DepotsSet
            .Where(d => d.IsActive)
            .OrderBy(d => d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var size40 = await context.ContainerSizesSet
            .FirstOrDefaultAsync(s => s.Label == "40" && s.IsActive, cancellationToken);

        if (depot is null || size40 is null)
            return;

        var today = PhilippinesTime.Today;
        var effectiveFrom = today.AddMonths(-1);
        var now = PhilippinesTime.UtcNow;

        var rates = new List<DemurrageDetentionRate>
        {
            new()
            {
                ShippingLineId = primaryLine.Id,
                DepotId = depot.Id,
                ContainerSizeId = size40.Id,
                DemurrageAmount = 4200m,
                DetentionAmount = 2800m,
                EffectiveFrom = effectiveFrom,
                IsActive = true,
                UpdatedAt = now,
            },
            new()
            {
                ShippingLineId = primaryLine.Id,
                DemurrageAmount = 3600m,
                DetentionAmount = 2400m,
                EffectiveFrom = effectiveFrom,
                IsActive = true,
                UpdatedAt = now,
            },
        };

        if (lines.Count > 1)
        {
            var secondaryLine = lines[1];
            rates.Add(new DemurrageDetentionRate
            {
                ShippingLineId = secondaryLine.Id,
                DemurrageAmount = 3800m,
                DetentionAmount = 2600m,
                EffectiveFrom = effectiveFrom,
                IsActive = true,
                UpdatedAt = now,
            });
        }

        context.DemurrageDetentionRatesSet.AddRange(rates);
        await context.SaveChangesAsync(cancellationToken);
    }
}
