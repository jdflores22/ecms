using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class UploadAccessService : IUploadAccessService
{
    private readonly IEcmsDbContext _db;

    public UploadAccessService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> CanAccessPathAsync(
        string relativePath,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var path = NormalizePath(relativePath);
        if (path is null)
            return false;

        if (path.StartsWith("/uploads/certificate-templates/", StringComparison.OrdinalIgnoreCase))
            return role == RoleNames.Administrator;

        if (await _db.Users.AsNoTracking().AnyAsync(
                u => u.ProfilePhoto == path && (u.Id == userId || role == RoleNames.Administrator),
                cancellationToken))
        {
            return true;
        }

        var payment = await _db.Payments.AsNoTracking()
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice)
            .FirstOrDefaultAsync(p => p.ProofFile == path, cancellationToken);
        if (payment is not null)
        {
            return role switch
            {
                RoleNames.Administrator => true,
                RoleNames.Trucker => payment.TruckerId == userId
                    || payment.Schedule.PreAdvice.TruckerId == userId,
                _ => false,
            };
        }

        var demurrage = await _db.DemurrageBillings.AsNoTracking()
            .FirstOrDefaultAsync(b => b.ProofFile == path, cancellationToken);
        if (demurrage is not null)
            return await CanAccessDemurrageAsync(demurrage, userId, role, cancellationToken);

        var preAdviceDoc = await _db.PreAdviceDocuments.AsNoTracking()
            .Select(d => new { d.FilePath, d.PreAdviceId })
            .FirstOrDefaultAsync(d => d.FilePath == path, cancellationToken);
        if (preAdviceDoc is not null)
            return await CanAccessPreAdviceAsync(preAdviceDoc.PreAdviceId, userId, role, cancellationToken);

        var withdrawalDoc = await _db.WithdrawalDocuments.AsNoTracking()
            .Select(d => new { d.FilePath, d.WithdrawalRequestId })
            .FirstOrDefaultAsync(d => d.FilePath == path, cancellationToken);
        if (withdrawalDoc is not null)
            return await CanAccessWithdrawalAsync(withdrawalDoc.WithdrawalRequestId, userId, role, cancellationToken);

        return false;
    }

    private async Task<bool> CanAccessDemurrageAsync(
        Domain.Entities.DemurrageBilling billing,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        return role switch
        {
            RoleNames.Administrator => true,
            RoleNames.Trucker => billing.TruckerId == userId,
            RoleNames.ShippingLineEvaluator => await EvaluatorOwnsShippingLineAsync(
                userId, billing.ShippingLineId, cancellationToken),
            _ => false,
        };
    }

    private async Task<bool> CanAccessPreAdviceAsync(
        int preAdviceId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        var preAdvice = await _db.PreAdvices.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == preAdviceId, cancellationToken);
        if (preAdvice is null)
            return false;

        if (RoleNames.IsPreAdviceManager(role))
            return preAdvice.TruckerId == userId;

        if (role == RoleNames.ShippingLineEvaluator)
            return await EvaluatorOwnsShippingLineAsync(userId, preAdvice.ShippingLineId, cancellationToken);

        if (role == RoleNames.Administrator || role == RoleNames.DepotPersonnel)
            return true;

        return false;
    }

    private async Task<bool> CanAccessWithdrawalAsync(
        int withdrawalId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        var withdrawal = await _db.WithdrawalRequests.AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == withdrawalId, cancellationToken);
        if (withdrawal is null)
            return false;

        if (role == RoleNames.Administrator)
            return true;

        if (RoleNames.IsPreAdviceManager(role))
            return withdrawal.TruckerId == userId;

        if (role == RoleNames.ShippingLineEvaluator)
            return await EvaluatorOwnsShippingLineAsync(userId, withdrawal.ShippingLineId, cancellationToken);

        if (role == RoleNames.DepotPersonnel)
        {
            var depotId = await _db.Users.AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.DepotId)
                .FirstOrDefaultAsync(cancellationToken);
            return depotId.HasValue && withdrawal.CurrentDepotId == depotId.Value;
        }

        return false;
    }

    private async Task<bool> EvaluatorOwnsShippingLineAsync(
        int userId,
        int shippingLineId,
        CancellationToken cancellationToken)
    {
        var userLineId = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.ShippingLineId)
            .FirstOrDefaultAsync(cancellationToken);
        return userLineId.HasValue && userLineId.Value == shippingLineId;
    }

    private static string? NormalizePath(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var path = raw.Trim();
        if (!path.StartsWith('/'))
            path = $"/{path}";

        if (!path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return null;

        return path;
    }
}
