using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class UploadAccessService : IUploadAccessService
{
    private sealed record UserAccessContext(int? ShippingLineId, int? DepotId);

    private readonly IEcmsDbContext _db;

    public UploadAccessService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlySet<string>> FilterAccessiblePathsAsync(
        IReadOnlyList<string> relativePaths,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (relativePaths.Count == 0)
            return allowed;

        var normalized = relativePaths
            .Select(NormalizePath)
            .Where(p => p is not null)
            .Cast<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalized.Count == 0)
            return allowed;

        var pending = new List<string>();
        foreach (var path in normalized)
        {
            if (path.StartsWith("/uploads/certificate-templates/", StringComparison.OrdinalIgnoreCase))
            {
                if (role == RoleNames.Administrator)
                    allowed.Add(path);
                continue;
            }

            if (path.StartsWith("/uploads/trucker-news/", StringComparison.OrdinalIgnoreCase))
            {
                allowed.Add(path);
                continue;
            }

            pending.Add(path);
        }

        if (pending.Count == 0)
            return allowed;

        var userContext = await LoadUserAccessContextAsync(userId, cancellationToken);

        var profilePaths = await _db.Users.AsNoTracking()
            .Where(u => pending.Contains(u.ProfilePhoto!))
            .Select(u => new { u.ProfilePhoto, u.Id })
            .ToListAsync(cancellationToken);
        foreach (var profile in profilePaths)
        {
            if (profile.ProfilePhoto is null)
                continue;
            if (profile.Id == userId || role == RoleNames.Administrator)
                allowed.Add(profile.ProfilePhoto);
        }

        var remaining = pending.Where(p => !allowed.Contains(p)).ToList();
        if (remaining.Count == 0)
            return allowed;

        var payments = await _db.Payments.AsNoTracking()
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice)
            .Where(p => remaining.Contains(p.ProofFile!))
            .ToListAsync(cancellationToken);
        foreach (var payment in payments)
        {
            if (payment.ProofFile is null)
                continue;
            var ok = role switch
            {
                RoleNames.Administrator => true,
                RoleNames.Trucker or RoleNames.Broker => payment.TruckerId == userId
                    || payment.Schedule.PreAdvice.TruckerId == userId,
                _ => false,
            };
            if (ok)
                allowed.Add(payment.ProofFile);
        }

        remaining = remaining.Where(p => !allowed.Contains(p)).ToList();
        if (remaining.Count == 0)
            return allowed;

        var demurrages = await _db.DemurrageBillings.AsNoTracking()
            .Where(b => remaining.Contains(b.ProofFile!))
            .ToListAsync(cancellationToken);
        foreach (var billing in demurrages)
        {
            if (billing.ProofFile is null)
                continue;
            if (await CanAccessDemurrageAsync(billing, userId, role, cancellationToken))
                allowed.Add(billing.ProofFile);
        }

        remaining = remaining.Where(p => !allowed.Contains(p)).ToList();
        if (remaining.Count == 0)
            return allowed;

        var preAdviceDocs = await _db.PreAdviceDocuments.AsNoTracking()
            .Where(d => remaining.Contains(d.FilePath))
            .Select(d => new { d.FilePath, d.PreAdviceId })
            .ToListAsync(cancellationToken);
        var preAdviceIds = preAdviceDocs.Select(d => d.PreAdviceId).Distinct().ToList();
        var preAdvices = await _db.PreAdvices.AsNoTracking()
            .Where(p => preAdviceIds.Contains(p.Id))
            .Select(p => new { p.Id, p.TruckerId, p.ShippingLineId })
            .ToDictionaryAsync(p => p.Id, cancellationToken);
        foreach (var doc in preAdviceDocs)
        {
            if (!preAdvices.TryGetValue(doc.PreAdviceId, out var preAdvice))
                continue;
            if (CanAccessPreAdvice(preAdvice.TruckerId, preAdvice.ShippingLineId, userId, role, userContext))
                allowed.Add(doc.FilePath);
        }

        remaining = remaining.Where(p => !allowed.Contains(p)).ToList();
        if (remaining.Count == 0)
            return allowed;

        var withdrawalDocs = await _db.WithdrawalDocuments.AsNoTracking()
            .Where(d => remaining.Contains(d.FilePath))
            .Select(d => new { d.FilePath, d.WithdrawalRequestId })
            .ToListAsync(cancellationToken);
        var withdrawalIds = withdrawalDocs.Select(d => d.WithdrawalRequestId).Distinct().ToList();
        var withdrawals = await _db.WithdrawalRequests.AsNoTracking()
            .Where(w => withdrawalIds.Contains(w.Id))
            .Select(w => new { w.Id, w.TruckerId, w.ShippingLineId, w.CurrentDepotId })
            .ToDictionaryAsync(w => w.Id, cancellationToken);
        foreach (var doc in withdrawalDocs)
        {
            if (!withdrawals.TryGetValue(doc.WithdrawalRequestId, out var withdrawal))
                continue;
            if (CanAccessWithdrawal(withdrawal.TruckerId, withdrawal.ShippingLineId, withdrawal.CurrentDepotId,
                    userId, role, userContext))
            {
                allowed.Add(doc.FilePath);
            }
        }

        return allowed;
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

        if (path.StartsWith("/uploads/trucker-news/", StringComparison.OrdinalIgnoreCase))
            return true;

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
                RoleNames.Trucker or RoleNames.Broker => payment.TruckerId == userId
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
            RoleNames.Trucker or RoleNames.Broker => billing.TruckerId == userId,
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
            .Where(p => p.Id == preAdviceId)
            .Select(p => new { p.TruckerId, p.ShippingLineId })
            .FirstOrDefaultAsync(cancellationToken);
        if (preAdvice is null)
            return false;

        var userContext = await LoadUserAccessContextAsync(userId, cancellationToken);

        return CanAccessPreAdvice(preAdvice.TruckerId, preAdvice.ShippingLineId, userId, role, userContext);
    }

    private async Task<bool> CanAccessWithdrawalAsync(
        int withdrawalId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        var withdrawal = await _db.WithdrawalRequests.AsNoTracking()
            .Where(w => w.Id == withdrawalId)
            .Select(w => new { w.TruckerId, w.ShippingLineId, w.CurrentDepotId })
            .FirstOrDefaultAsync(cancellationToken);
        if (withdrawal is null)
            return false;

        var userContext = await LoadUserAccessContextAsync(userId, cancellationToken);

        return CanAccessWithdrawal(
            withdrawal.TruckerId,
            withdrawal.ShippingLineId,
            withdrawal.CurrentDepotId,
            userId,
            role,
            userContext);
    }

    private static bool CanAccessPreAdvice(
        int truckerId,
        int shippingLineId,
        int userId,
        string role,
        UserAccessContext? userContext)
    {
        if (RoleNames.IsPreAdviceManager(role))
            return truckerId == userId;

        if (role == RoleNames.ShippingLineEvaluator)
            return userContext?.ShippingLineId.HasValue == true
                && userContext.ShippingLineId.Value == shippingLineId;

        return role is RoleNames.Administrator or RoleNames.DepotPersonnel;
    }

    private static bool CanAccessWithdrawal(
        int truckerId,
        int shippingLineId,
        int currentDepotId,
        int userId,
        string role,
        UserAccessContext? userContext)
    {
        if (role == RoleNames.Administrator)
            return true;

        if (RoleNames.IsPreAdviceManager(role))
            return truckerId == userId;

        if (role == RoleNames.ShippingLineEvaluator)
            return userContext?.ShippingLineId.HasValue == true
                && userContext.ShippingLineId.Value == shippingLineId;

        if (role == RoleNames.DepotPersonnel)
            return userContext?.DepotId.HasValue == true
                && userContext.DepotId.Value == currentDepotId;

        return false;
    }

    private async Task<UserAccessContext?> LoadUserAccessContextAsync(
        int userId,
        CancellationToken cancellationToken)
    {
        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new UserAccessContext(u.ShippingLineId, u.DepotId))
            .FirstOrDefaultAsync(cancellationToken);
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

        var path = raw.Trim().Replace('\\', '/');
        if (!path.StartsWith('/'))
            path = $"/{path}";

        if (path.Contains("..", StringComparison.Ordinal))
            return null;

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 2
            || !string.Equals(segments[0], "uploads", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return "/" + string.Join('/', segments);
    }
}
