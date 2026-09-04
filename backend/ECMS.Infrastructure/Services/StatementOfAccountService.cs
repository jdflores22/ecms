using ECMS.Application.DTOs.StatementOfAccount;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class StatementOfAccountService : IStatementOfAccountService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;

    public StatementOfAccountService(
        IEcmsDbContext db,
        IAuditService auditService,
        INotificationService notifications)
    {
        _db = db;
        _auditService = auditService;
        _notifications = notifications;
    }

    public async Task<ShippingLineCreditLineDto> GetOrCreateCreditLineAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        var line = await _db.ShippingLineCreditLines
            .Include(c => c.ShippingLine)
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLineId, cancellationToken);

        if (line is null)
        {
            line = new ShippingLineCreditLine
            {
                ShippingLineId = shippingLineId,
                CreditLimit = 500_000m,
                UtilizedAmount = 0m,
                IsActive = true,
                UpdatedAt = PhilippinesTime.UtcNow,
            };
            _db.Add(line);
            await _db.SaveChangesAsync(cancellationToken);
            line = await _db.ShippingLineCreditLines
                .Include(c => c.ShippingLine)
                .FirstAsync(c => c.Id == line.Id, cancellationToken);
        }

        return MapCreditLine(line);
    }

    public async Task<ShippingLineCreditLineDto> UpdateCreditLineAsync(
        UpdateShippingLineCreditLineRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (request.CreditLimit < 0)
            throw new InvalidOperationException("Credit limit cannot be negative.");
        if (request.CreditLimit > 100_000_000)
            throw new InvalidOperationException("Credit limit exceeds the allowed maximum.");

        var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        var line = await _db.ShippingLineCreditLines
            .Include(c => c.ShippingLine)
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLineId, cancellationToken);

        if (line is null)
        {
            line = new ShippingLineCreditLine
            {
                ShippingLineId = shippingLineId,
                CreditLimit = request.CreditLimit,
                UtilizedAmount = 0m,
                IsActive = request.IsActive,
                UpdatedAt = PhilippinesTime.UtcNow,
            };
            _db.Add(line);
        }
        else
        {
            if (request.CreditLimit < line.UtilizedAmount)
                throw new InvalidOperationException("Credit limit cannot be lower than the utilized amount.");
            line.CreditLimit = request.CreditLimit;
            line.IsActive = request.IsActive;
            line.UpdatedAt = PhilippinesTime.UtcNow;
            _db.Update(line);
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            userId,
            "Update",
            "ShippingLineCreditLine",
            $"{line.ShippingLine?.Name ?? shippingLineId.ToString()} · limit ₱{line.CreditLimit:N0}",
            cancellationToken);

        return MapCreditLine(await _db.ShippingLineCreditLines
            .Include(c => c.ShippingLine)
            .FirstAsync(c => c.Id == line.Id, cancellationToken));
    }

    public async Task<IReadOnlyList<EligibleSoaBillingDto>> GetEligibleBillingsAsync(
        int? truckerId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        var activeSoaBillingIds = await ActiveSoaBillingIdsAsync(cancellationToken);

        var query = _db.DemurrageBillings
            .Include(b => b.PreAdvice)
            .Include(b => b.Trucker)
            .Include(b => b.FeeLines)
            .Where(b =>
                b.ShippingLineId == shippingLineId
                && b.Status == PaymentStatus.Pending
                && !activeSoaBillingIds.Contains(b.Id));

        if (truckerId.HasValue)
            query = query.Where(b => b.TruckerId == truckerId.Value);

        var items = await query
            .OrderBy(b => b.Trucker.FullName)
            .ThenByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(b => new EligibleSoaBillingDto(
            b.Id,
            b.ReferenceNo,
            b.ContainerNoNormalized,
            b.PreAdvice.ReferenceNo,
            b.Trucker.FullName ?? b.Trucker.Username,
            b.TruckerId,
            BillingTotal(b),
            b.ExpiredOn.ToString("yyyy-MM-dd"),
            b.Status)).ToList();
    }

    public async Task<IReadOnlyList<SoaTruckerRegisterDto>> GetEligibleTruckerRegisterAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var billings = await GetEligibleBillingsAsync(null, userId, role, cancellationToken);
        return billings
            .GroupBy(b => b.TruckerId)
            .Select(g =>
            {
                var ordered = g.OrderBy(b => b.ExpiredOn).ToList();
                return new SoaTruckerRegisterDto(
                    g.Key,
                    g.First().TruckerName,
                    g.Count(),
                    g.Sum(b => b.TotalAmount),
                    ordered.First().ExpiredOn,
                    ordered.Last().ExpiredOn,
                    ordered.Select(b => b.DemurrageBillingId).ToList());
            })
            .OrderBy(r => r.TruckerName)
            .ToList();
    }

    public async Task<IReadOnlyList<StatementOfAccountDto>> GetAllAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var query = QueryWithIncludes();

        if (role == RoleNames.Trucker)
            query = query.Where(s => s.TruckerId == userId);
        else if (role == RoleNames.ShippingLineEvaluator)
        {
            var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
            query = query.Where(s => s.ShippingLineId == shippingLineId);
        }
        else
        {
            return Array.Empty<StatementOfAccountDto>();
        }

        var items = await query.OrderByDescending(s => s.CreatedAt).ToListAsync(cancellationToken);
        return items.Select(Map).ToList();
    }

    public async Task<StatementOfAccountDto?> GetByIdAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var entity = await QueryWithIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null || !await CanAccessAsync(entity, userId, role, cancellationToken))
            return null;
        return Map(entity);
    }

    public async Task<StatementOfAccountDto> CreateAsync(
        CreateStatementOfAccountRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (request.DemurrageBillingIds.Count == 0)
            throw new InvalidOperationException("Select at least one billing to include in the SOA.");

        var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        var activeSoaBillingIds = await ActiveSoaBillingIdsAsync(cancellationToken);

        var billingIds = request.DemurrageBillingIds.Distinct().ToList();

        var billings = await _db.DemurrageBillings
            .Include(b => b.PreAdvice)
            .Include(b => b.Trucker)
            .Include(b => b.FeeLines)
            .Where(b => billingIds.Contains(b.Id))
            .ToListAsync(cancellationToken);

        if (billings.Count != billingIds.Count)
            throw new InvalidOperationException("One or more billings were not found.");

        if (billings.Any(b => b.ShippingLineId != shippingLineId))
            throw new InvalidOperationException("All billings must belong to your shipping line.");

        if (billings.Any(b => b.TruckerId != request.TruckerId))
            throw new InvalidOperationException("All billings must belong to the selected trucker.");

        if (billings.Any(b => b.Status != PaymentStatus.Pending))
            throw new InvalidOperationException("Only outstanding billings can be added to an SOA.");

        if (billings.Any(b => activeSoaBillingIds.Contains(b.Id)))
            throw new InvalidOperationException("One or more billings are already on an active SOA.");

        var creditLine = await GetOrCreateCreditEntityAsync(shippingLineId, cancellationToken);
        var total = billings.Sum(BillingTotal);
        var creditApplied = ValidateCreditApplied(creditLine, request.CreditApplied, total);

        var soa = new StatementOfAccount
        {
            ReferenceNo = await GenerateReferenceNoAsync(cancellationToken),
            ShippingLineId = shippingLineId,
            TruckerId = request.TruckerId,
            PeriodFrom = billings.Min(b => b.ExpiredOn),
            PeriodTo = billings.Max(b => b.ExpiredOn),
            Status = StatementOfAccountStatus.Draft,
            TotalAmount = total,
            CreditApplied = creditApplied,
            AmountDue = total - creditApplied,
            Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim(),
            IssuedByUserId = userId,
        };

        if (!string.IsNullOrWhiteSpace(request.DueDate)
            && DateOnly.TryParse(request.DueDate, out var dueDate))
        {
            soa.DueDate = dueDate;
        }

        _db.Add(soa);
        await _db.SaveChangesAsync(cancellationToken);

        var sort = 1;
        foreach (var billing in billings.OrderBy(b => b.ExpiredOn).ThenBy(b => b.ReferenceNo))
        {
            var amount = BillingTotal(billing);
            _db.Add(new StatementOfAccountLine
            {
                StatementOfAccountId = soa.Id,
                DemurrageBillingId = billing.Id,
                Description = $"{billing.ReferenceNo} · {billing.ContainerNoNormalized} · {billing.PreAdvice.ReferenceNo}",
                Amount = amount,
                SortOrder = sort++,
            });
            billing.StatementOfAccountId = soa.Id;
            _db.Update(billing);
        }

        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "StatementOfAccount", soa.ReferenceNo, cancellationToken);

        if (request.IssueImmediately)
        {
            var issued = await IssueInternalAsync(soa.Id, userId, soa.DueDate, soa.Remarks, cancellationToken);
            return issued ?? throw new InvalidOperationException("Failed to issue SOA.");
        }

        return Map(await ReloadAsync(soa.Id, cancellationToken));
    }

    public async Task<StatementOfAccountDto?> IssueAsync(
        int id,
        IssueStatementOfAccountRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        DateOnly? dueDate = null;
        if (!string.IsNullOrWhiteSpace(request.DueDate) && DateOnly.TryParse(request.DueDate, out var parsed))
            dueDate = parsed;

        return await IssueInternalAsync(id, userId, dueDate, request.Remarks, cancellationToken);
    }

    public async Task<StatementOfAccountDto?> CancelAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        var soa = await QueryWithIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (soa is null || soa.ShippingLineId != shippingLineId)
            return null;

        if (soa.Status is StatementOfAccountStatus.Paid or StatementOfAccountStatus.Cancelled)
            throw new InvalidOperationException("This SOA can no longer be cancelled.");

        if (soa.CreditApplied > 0)
        {
            var creditLine = await GetOrCreateCreditEntityAsync(shippingLineId, cancellationToken);
            creditLine.UtilizedAmount = Math.Max(0m, creditLine.UtilizedAmount - soa.CreditApplied);
            creditLine.UpdatedAt = PhilippinesTime.UtcNow;
            _db.Update(creditLine);
        }

        foreach (var line in soa.Lines)
        {
            var billing = line.DemurrageBilling;
            billing.StatementOfAccountId = null;
            _db.Update(billing);
        }

        soa.Status = StatementOfAccountStatus.Cancelled;
        _db.Update(soa);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Cancel", "StatementOfAccount", soa.ReferenceNo, cancellationToken);

        return Map(await ReloadAsync(soa.Id, cancellationToken));
    }

    public async Task<StatementOfAccountDto?> UploadProofAsync(
        int id,
        int truckerId,
        string proofWebPath,
        string? proofReferenceNo,
        DateTime? proofTransactionAt,
        CancellationToken cancellationToken = default)
    {
        var soa = await QueryWithIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (soa is null || soa.TruckerId != truckerId)
            return null;

        if (soa.Status is not (StatementOfAccountStatus.Issued or StatementOfAccountStatus.ForVerification))
            throw new InvalidOperationException("This SOA is not open for payment.");

        if (soa.AmountDue <= 0)
            throw new InvalidOperationException("No cash payment is required for this SOA.");

        soa.ProofFile = proofWebPath;
        soa.ProofReferenceNo = PaymentProofTextParser.NormalizeReferenceNo(proofReferenceNo);
        soa.ProofTransactionAt = proofTransactionAt;
        soa.Status = StatementOfAccountStatus.ForVerification;
        _db.Update(soa);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(truckerId, "UploadProof", "StatementOfAccount", soa.ReferenceNo, cancellationToken);

        var evaluators = await (
            from u in _db.Users
            join r in _db.Roles on u.RoleId equals r.Id
            where u.ShippingLineId == soa.ShippingLineId && r.Name == RoleNames.ShippingLineEvaluator
            select u.Id).ToListAsync(cancellationToken);

        if (evaluators.Count > 0)
        {
            await _notifications.NotifyUsersAsync(
                evaluators,
                "SOA payment proof uploaded",
                $"{soa.ReferenceNo} — ₱{soa.AmountDue:N0} awaiting verification.",
                "StatementOfAccount",
                "/evaluations/statement-of-accounts/" + soa.Id,
                truckerId,
                soa.ReferenceNo,
                cancellationToken);
        }

        return Map(await ReloadAsync(soa.Id, cancellationToken));
    }

    public async Task<StatementOfAccountDto?> VerifyAsync(
        int id,
        VerifyStatementOfAccountRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineIdAsync(userId, role, cancellationToken);
        var soa = await QueryWithIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (soa is null || soa.ShippingLineId != shippingLineId)
            return null;

        if (soa.Status != StatementOfAccountStatus.ForVerification && !(soa.Status == StatementOfAccountStatus.Issued && soa.AmountDue <= 0))
            throw new InvalidOperationException("Only SOAs awaiting verification can be approved or rejected.");

        if (soa.AmountDue > 0 && string.IsNullOrWhiteSpace(soa.ProofFile) && request.Approved)
            throw new InvalidOperationException("No payment proof has been uploaded for this SOA.");

        if (!string.IsNullOrWhiteSpace(request.ProofReferenceNo))
            soa.ProofReferenceNo = PaymentProofTextParser.NormalizeReferenceNo(request.ProofReferenceNo);
        if (request.ProofTransactionAt.HasValue)
            soa.ProofTransactionAt = request.ProofTransactionAt;

        if (request.Approved)
        {
            soa.Status = StatementOfAccountStatus.Paid;
            soa.PaidAt = PhilippinesTime.UtcNow;
            foreach (var line in soa.Lines)
            {
                var billing = line.DemurrageBilling;
                billing.Status = PaymentStatus.Paid;
                billing.PaidAt = soa.PaidAt;
                _db.Update(billing);
            }
        }
        else
        {
            soa.Status = StatementOfAccountStatus.Issued;
            soa.ProofFile = null;
            soa.ProofReferenceNo = null;
            soa.ProofTransactionAt = null;
        }

        _db.Update(soa);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(
            userId,
            request.Approved ? "Approve" : "Reject",
            "StatementOfAccount",
            soa.ReferenceNo,
            cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { soa.TruckerId },
            request.Approved ? "SOA payment approved" : "SOA payment rejected",
            request.Approved
                ? $"{soa.ReferenceNo} has been settled. Included demurrage billings are now paid."
                : $"{soa.ReferenceNo} payment was rejected. Upload a new proof.",
            "StatementOfAccount",
            "/trucker/statement-of-accounts/" + soa.Id,
            userId,
            soa.ReferenceNo,
            cancellationToken);

        return Map(await ReloadAsync(soa.Id, cancellationToken));
    }

    public async Task<int> GetPaymentDueCountAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.Trucker)
            return 0;

        return await _db.StatementOfAccounts.CountAsync(
            s => s.TruckerId == userId
                 && (s.Status == StatementOfAccountStatus.Issued || s.Status == StatementOfAccountStatus.ForVerification)
                 && s.AmountDue > 0,
            cancellationToken);
    }

    private async Task<StatementOfAccountDto?> IssueInternalAsync(
        int id,
        int userId,
        DateOnly? dueDate,
        string? remarks,
        CancellationToken cancellationToken)
    {
        var soa = await QueryWithIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (soa is null)
            return null;

        if (soa.Status != StatementOfAccountStatus.Draft)
            throw new InvalidOperationException("Only draft SOAs can be issued.");

        if (soa.Lines.Count == 0)
            throw new InvalidOperationException("SOA must contain at least one billing line.");

        var creditLine = await GetOrCreateCreditEntityAsync(soa.ShippingLineId, cancellationToken);
        if (soa.CreditApplied > 0)
        {
            if (!creditLine.IsActive)
                throw new InvalidOperationException("Credit line is inactive.");
            var available = creditLine.CreditLimit - creditLine.UtilizedAmount;
            if (soa.CreditApplied > available)
                throw new InvalidOperationException("Insufficient credit line available.");
            creditLine.UtilizedAmount += soa.CreditApplied;
            creditLine.UpdatedAt = PhilippinesTime.UtcNow;
            _db.Update(creditLine);
        }

        soa.Status = StatementOfAccountStatus.Issued;
        soa.IssuedAt = PhilippinesTime.UtcNow;
        soa.IssuedByUserId = userId;
        soa.DueDate = dueDate ?? soa.DueDate ?? PhilippinesTime.Today.AddDays(14);
        if (!string.IsNullOrWhiteSpace(remarks))
            soa.Remarks = remarks.Trim();

        _db.Update(soa);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Issue", "StatementOfAccount", soa.ReferenceNo, cancellationToken);

        await _notifications.NotifyUsersAsync(
            new[] { soa.TruckerId },
            "Statement of account issued",
            $"{soa.ReferenceNo} — total ₱{soa.TotalAmount:N0}"
            + (soa.CreditApplied > 0 ? $" (credit ₱{soa.CreditApplied:N0}, due ₱{soa.AmountDue:N0})" : "")
            + ". Review and settle under Statement of accounts.",
            "StatementOfAccount",
            "/trucker/statement-of-accounts/" + soa.Id,
            userId,
            soa.ReferenceNo,
            cancellationToken);

        if (soa.AmountDue <= 0)
        {
            return await VerifyAsync(
                soa.Id,
                new VerifyStatementOfAccountRequest(true, null, null),
                userId,
                RoleNames.ShippingLineEvaluator,
                cancellationToken);
        }

        return Map(await ReloadAsync(soa.Id, cancellationToken));
    }

    private async Task<HashSet<int>> ActiveSoaBillingIdsAsync(CancellationToken cancellationToken)
    {
        var ids = await _db.StatementOfAccountLines
            .Where(l => l.StatementOfAccount.Status != StatementOfAccountStatus.Cancelled
                        && l.StatementOfAccount.Status != StatementOfAccountStatus.Paid)
            .Select(l => l.DemurrageBillingId)
            .ToListAsync(cancellationToken);
        return ids.ToHashSet();
    }

    private async Task<int> RequireEvaluatorShippingLineIdAsync(
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new InvalidOperationException("Only shipping line evaluators can manage statements of account.");

        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.ShippingLineId.HasValue)
            throw new InvalidOperationException("Your account is not linked to a shipping line.");
        return user.ShippingLineId.Value;
    }

    private async Task<ShippingLineCreditLine> GetOrCreateCreditEntityAsync(
        int shippingLineId,
        CancellationToken cancellationToken)
    {
        var line = await _db.ShippingLineCreditLines
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLineId, cancellationToken);
        if (line is not null)
            return line;

        line = new ShippingLineCreditLine
        {
            ShippingLineId = shippingLineId,
            CreditLimit = 500_000m,
            UtilizedAmount = 0m,
            IsActive = true,
            UpdatedAt = PhilippinesTime.UtcNow,
        };
        _db.Add(line);
        await _db.SaveChangesAsync(cancellationToken);
        return line;
    }

    private static decimal ValidateCreditApplied(
        ShippingLineCreditLine creditLine,
        decimal requested,
        decimal total)
    {
        if (requested < 0)
            throw new InvalidOperationException("Credit applied cannot be negative.");
        if (requested > total)
            throw new InvalidOperationException("Credit applied cannot exceed the SOA total.");
        if (requested > 0 && !creditLine.IsActive)
            throw new InvalidOperationException("Credit line is inactive.");
        if (requested > 0)
        {
            var available = creditLine.CreditLimit - creditLine.UtilizedAmount;
            if (requested > available)
                throw new InvalidOperationException($"Insufficient credit line. Available: ₱{available:N0}.");
        }

        return requested;
    }

    private async Task<bool> CanAccessAsync(
        StatementOfAccount soa,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        if (role == RoleNames.Trucker)
            return soa.TruckerId == userId;
        if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
            return user.ShippingLineId == soa.ShippingLineId;
        }

        return false;
    }

    private IQueryable<StatementOfAccount> QueryWithIncludes() =>
        _db.StatementOfAccounts
            .Include(s => s.ShippingLine)
            .Include(s => s.Trucker)
            .Include(s => s.IssuedByUser)
            .Include(s => s.Lines)
                .ThenInclude(l => l.DemurrageBilling)
                    .ThenInclude(b => b.PreAdvice);

    private async Task<StatementOfAccount> ReloadAsync(int id, CancellationToken cancellationToken) =>
        await QueryWithIncludes().FirstAsync(s => s.Id == id, cancellationToken);

    private async Task<string> GenerateReferenceNoAsync(CancellationToken cancellationToken)
    {
        var year = PhilippinesTime.Today.Year;
        var prefix = $"SOA-{year}-";
        var last = await _db.StatementOfAccounts
            .Where(s => s.ReferenceNo.StartsWith(prefix))
            .OrderByDescending(s => s.ReferenceNo)
            .Select(s => s.ReferenceNo)
            .FirstOrDefaultAsync(cancellationToken);

        var seq = 1;
        if (!string.IsNullOrEmpty(last))
        {
            var suffix = last[prefix.Length..];
            if (int.TryParse(suffix, out var parsed))
                seq = parsed + 1;
        }

        return $"{prefix}{seq:D6}";
    }

    private static decimal BillingTotal(DemurrageBilling b) =>
        b.FeeLines.Count > 0
            ? b.FeeLines.Sum(l => l.Amount)
            : b.DemurrageAmount + b.DetentionAmount;

    private static ShippingLineCreditLineDto MapCreditLine(ShippingLineCreditLine line) =>
        new(
            line.Id,
            line.ShippingLineId,
            line.ShippingLine.Name,
            line.CreditLimit,
            line.UtilizedAmount,
            Math.Max(0m, line.CreditLimit - line.UtilizedAmount),
            line.IsActive,
            line.UpdatedAt);

    private static StatementOfAccountDto Map(StatementOfAccount s) =>
        new(
            s.Id,
            s.ReferenceNo,
            s.ShippingLineId,
            s.ShippingLine.Name,
            s.TruckerId,
            s.Trucker.FullName ?? s.Trucker.Username,
            s.PeriodFrom?.ToString("yyyy-MM-dd"),
            s.PeriodTo?.ToString("yyyy-MM-dd"),
            s.Status,
            s.TotalAmount,
            s.CreditApplied,
            s.AmountDue,
            s.DueDate?.ToString("yyyy-MM-dd"),
            s.IssuedAt,
            s.PaidAt,
            s.IssuedByUser?.FullName,
            s.Remarks,
            s.ProofFile,
            s.ProofReferenceNo,
            s.ProofTransactionAt,
            s.CreatedAt,
            s.Lines
                .OrderBy(l => l.SortOrder)
                .Select(l => new StatementOfAccountLineDto(
                    l.Id,
                    l.DemurrageBillingId,
                    l.DemurrageBilling.ReferenceNo,
                    l.DemurrageBilling.ContainerNoNormalized,
                    l.DemurrageBilling.PreAdvice.ReferenceNo,
                    l.Description,
                    l.Amount,
                    l.SortOrder,
                    l.DemurrageBilling.Status))
                .ToList());
}
