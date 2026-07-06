using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Persistence;

/// <summary>
/// Demo yard inventory at ~85% (20ft) and ~93% (40/45ft) contract utilization for withdrawal testing.
/// </summary>
internal static class YardInventoryDemoSeeder
{
    public const string SeedRemarkPrefix = "SEED:YARD-DEMO:";

    public static async Task SeedAsync(EcmsDbContext context, CancellationToken cancellationToken = default)
    {
        var depot = await context.DepotsSet.FirstOrDefaultAsync(cancellationToken);
        var evaluator = await context.UsersSet.FirstOrDefaultAsync(u => u.Username == "evaluator1", cancellationToken);
        var size20 = await context.ContainerSizesSet.FirstOrDefaultAsync(s => s.Label == "20", cancellationToken);
        var size40 = await context.ContainerSizesSet.FirstOrDefaultAsync(s => s.Label == "40", cancellationToken);
        var typeGp = await context.ContainerTypesSet.FirstOrDefaultAsync(t => t.Code == "GP", cancellationToken);
        var typeHc = await context.ContainerTypesSet.FirstOrDefaultAsync(t => t.Code == "HC", cancellationToken);
        var typeRf = await context.ContainerTypesSet.FirstOrDefaultAsync(t => t.Code == "RF", cancellationToken);
        var typeOt = await context.ContainerTypesSet.FirstOrDefaultAsync(t => t.Code == "OT", cancellationToken);

        if (depot is null || evaluator is null || size20 is null || size40 is null
            || typeGp is null || typeHc is null || typeRf is null || typeOt is null)
            return;

        var shippingLine = evaluator.ShippingLineId.HasValue
            ? await context.ShippingLinesSet.FirstOrDefaultAsync(s => s.Id == evaluator.ShippingLineId.Value, cancellationToken)
            : await context.ShippingLinesSet.FirstOrDefaultAsync(cancellationToken);

        if (shippingLine is null)
            return;

        var seedRemark = $"{SeedRemarkPrefix}{shippingLine.Code}";

        if (await context.ManualYardInventoryEntriesSet.AnyAsync(e => e.Remarks == seedRemark, cancellationToken))
            return;

        var contract = await context.ShippingLineDepotContractsSet
            .Include(c => c.SizeAllocations)
            .ThenInclude(a => a.ContainerSize)
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLine.Id && c.DepotId == depot.Id, cancellationToken);

        if (contract is null)
            return;

        const int defaultContract20 = 100;
        const int defaultContract40 = 100;
        EnsureSizeAllocation(contract, size20, defaultContract20);
        EnsureSizeAllocation(contract, size40, defaultContract40);
        contract.ContractTeu = defaultContract20 + defaultContract40 * 2;
        contract.IsActive = true;

        var contract20 = contract.SizeAllocations.FirstOrDefault(a => a.ContainerSizeId == size20.Id)?.ContractCount ?? defaultContract20;
        var contract40 = contract.SizeAllocations.FirstOrDefault(a => a.ContainerSizeId == size40.Id)?.ContractCount ?? defaultContract40;
        var count20 = Math.Max(1, (int)Math.Round(contract20 * 0.85m, MidpointRounding.AwayFromZero));
        var count40 = Math.Max(1, (int)Math.Round(contract40 * 0.93m, MidpointRounding.AwayFromZero));
        var today = PhilippinesTime.Today;
        var entries = new List<ManualYardInventoryEntry>();
        var lineCode = shippingLine.Code.Length >= 4
            ? shippingLine.Code[..4].ToUpperInvariant()
            : shippingLine.Code.ToUpperInvariant().PadRight(4, 'X');

        var type20Cycle = new[] { typeGp, typeRf, typeOt, typeGp };
        for (var i = 1; i <= count20; i++)
        {
            var type = type20Cycle[(i - 1) % type20Cycle.Length];
            entries.Add(new ManualYardInventoryEntry
            {
                ContainerNo = $"{lineCode}{i:D7}",
                ContainerSizeId = size20.Id,
                ContainerTypeId = type.Id,
                DepotId = depot.Id,
                ShippingLineId = shippingLine.Id,
                YardInDate = today.AddDays(-(i % 28 + 1)),
                Remarks = seedRemark,
                CreatedByUserId = evaluator.Id,
            });
        }

        var type40Cycle = new[] { typeGp, typeHc, typeRf, typeOt, typeHc, typeGp };
        for (var i = 1; i <= count40; i++)
        {
            var type = i == 1 ? typeHc : type40Cycle[(i - 1) % type40Cycle.Length];
            var containerNo = i == 1 ? "TGHU1234567" : $"{lineCode}4{i + 1:D6}";
            entries.Add(new ManualYardInventoryEntry
            {
                ContainerNo = containerNo,
                ContainerSizeId = size40.Id,
                ContainerTypeId = type.Id,
                DepotId = depot.Id,
                ShippingLineId = shippingLine.Id,
                YardInDate = today.AddDays(-(i % 35 + 2)),
                Remarks = seedRemark,
                CreatedByUserId = evaluator.Id,
            });
        }

        context.ManualYardInventoryEntriesSet.AddRange(entries);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static void EnsureSizeAllocation(ShippingLineDepotContract contract, ContainerSize size, int contractCount)
    {
        var existing = contract.SizeAllocations.FirstOrDefault(a => a.ContainerSizeId == size.Id);
        if (existing is null)
        {
            contract.SizeAllocations.Add(new ShippingLineDepotContractSizeAllocation
            {
                ContainerSizeId = size.Id,
                ContractCount = contractCount,
            });
            return;
        }

        if (existing.ContractCount < contractCount)
            existing.ContractCount = contractCount;
    }
}
