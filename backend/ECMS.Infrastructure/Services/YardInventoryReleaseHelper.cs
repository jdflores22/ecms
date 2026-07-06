using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public sealed record ReleasedYardDetail(
    string ReferenceNo,
    DateTime ReleasedAt,
    int WithdrawalRequestId,
    int WithdrawalLineId);

public static class YardInventoryReleaseHelper
{
    public static string BuildKey(int depotId, string containerNoNormalized, int containerSizeId, int containerTypeId)
        => $"{depotId}|{containerNoNormalized}|{containerSizeId}|{containerTypeId}";

    public static async Task<Dictionary<string, ReleasedYardDetail>> GetReleasedDetailsAsync(
        IEcmsDbContext db,
        int shippingLineId,
        CancellationToken cancellationToken = default)
    {
        var rows = await db.WithdrawalRequestLines
            .AsNoTracking()
            .Where(l => l.LineStatus == WithdrawalLineStatus.Released)
            .Where(l => l.WithdrawalRequest.ShippingLineId == shippingLineId)
            .Select(l => new
            {
                l.WithdrawalRequest.CurrentDepotId,
                l.ContainerNoNormalized,
                l.ContainerSizeId,
                l.ContainerTypeId,
                l.WithdrawalRequest.ReferenceNo,
                ReleasedAt = l.ReleasedAt ?? l.CreatedAt,
                l.WithdrawalRequestId,
                LineId = l.Id,
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<string, ReleasedYardDetail>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            var key = BuildKey(row.CurrentDepotId, row.ContainerNoNormalized, row.ContainerSizeId, row.ContainerTypeId);
            result[key] = new ReleasedYardDetail(
                row.ReferenceNo,
                row.ReleasedAt,
                row.WithdrawalRequestId,
                row.LineId);
        }

        return result;
    }

    public static async Task<bool> IsReleasedAsync(
        IEcmsDbContext db,
        int shippingLineId,
        int depotId,
        string containerNoNormalized,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default)
    {
        if (await db.ManualYardInventoryEntries.AsNoTracking().AnyAsync(
                e => e.ShippingLineId == shippingLineId
                    && e.DepotId == depotId
                    && e.ContainerNo == containerNoNormalized
                    && e.ContainerSizeId == containerSizeId
                    && e.ContainerTypeId == containerTypeId
                    && e.YardStatus == YardInventoryStatus.Released,
                cancellationToken))
        {
            return true;
        }

        return await db.WithdrawalRequestLines
            .AsNoTracking()
            .AnyAsync(
                l => l.LineStatus == WithdrawalLineStatus.Released
                    && l.WithdrawalRequest.ShippingLineId == shippingLineId
                    && l.WithdrawalRequest.CurrentDepotId == depotId
                    && l.ContainerNoNormalized == containerNoNormalized
                    && l.ContainerSizeId == containerSizeId
                    && l.ContainerTypeId == containerTypeId,
                cancellationToken);
    }
}
