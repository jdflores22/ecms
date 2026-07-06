using ECMS.Application;
using ECMS.Application.DTOs.DemurrageBilling;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class DemurrageBillingService : IDemurrageBillingService
{
    private const int SyncIntervalMinutes = 15;
    private static DateTime _lastSyncUtc = DateTime.MinValue;
    private static readonly SemaphoreSlim SyncLock = new(1, 1);

    private readonly IEcmsDbContext _db;
    private readonly IPaymentSettingsService _paymentSettings;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;
    private readonly IPaymentProofExtractionService _proofExtraction;

    public DemurrageBillingService(
        IEcmsDbContext db,
        IPaymentSettingsService paymentSettings,
        IAuditService auditService,
        INotificationService notifications,
        IPaymentProofExtractionService proofExtraction)
    {
        _db = db;
        _paymentSettings = paymentSettings;
        _auditService = auditService;
        _notifications = notifications;
        _proofExtraction = proofExtraction;
    }

    public async Task SyncExpiredBillingsAsync(CancellationToken cancellationToken = default)
    {
        var today = PhilippinesTime.Today;
        var candidates = await _db.PreAdvices
            .Include(p => p.Schedule!)
                .ThenInclude(s => s.QRBooking)
            .Where(p =>
                p.DemurrageValidUntil != null
                && p.DemurrageValidUntil < today
                && p.Status == PreAdviceStatus.Approved)
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0)
        {
            _lastSyncUtc = DateTime.UtcNow;
            return;
        }

        var existingPreAdviceIds = await _db.DemurrageBillings
            .Where(b => candidates.Select(c => c.Id).Contains(b.PreAdviceId))
            .Select(b => b.PreAdviceId)
            .ToListAsync(cancellationToken);
        var existingSet = existingPreAdviceIds.ToHashSet();

        var demurrageFee = await _paymentSettings.GetDemurrageFeeAmountAsync(cancellationToken);
        var detentionFee = await _paymentSettings.GetDetentionFeeAmountAsync(cancellationToken);
        var nextReference = await GetNextReferenceSequenceAsync(cancellationToken);

        foreach (var preAdvice in candidates)
        {
            if (existingSet.Contains(preAdvice.Id))
                continue;
            if (IsSuccessfullyReturned(preAdvice))
                continue;

            var validUntil = preAdvice.DemurrageValidUntil!.Value;
            var billing = new DemurrageBilling
            {
                ReferenceNo = nextReference.Next(),
                PreAdviceId = preAdvice.Id,
                ShippingLineId = preAdvice.ShippingLineId,
                TruckerId = preAdvice.TruckerId,
                ContainerNoNormalized = preAdvice.ContainerNoNormalized,
                ContainerSizeId = preAdvice.ContainerSizeId,
                ContainerTypeId = preAdvice.ContainerTypeId,
                DemurrageValidUntil = validUntil,
                ExpiredOn = today,
                DemurrageAmount = demurrageFee,
                DetentionAmount = detentionFee,
                Status = PaymentStatus.Pending,
            };
            ApplyDefaultFeeLines(billing, demurrageFee, detentionFee);
            _db.Add(billing);
        }

        await _db.SaveChangesAsync(cancellationToken);
        _lastSyncUtc = DateTime.UtcNow;
    }

    private async Task MaybeSyncExpiredBillingsAsync(CancellationToken cancellationToken)
    {
        if (DateTime.UtcNow - _lastSyncUtc < TimeSpan.FromMinutes(SyncIntervalMinutes))
            return;

        await SyncLock.WaitAsync(cancellationToken);
        try
        {
            if (DateTime.UtcNow - _lastSyncUtc < TimeSpan.FromMinutes(SyncIntervalMinutes))
                return;

            await SyncExpiredBillingsAsync(cancellationToken);
        }
        finally
        {
            SyncLock.Release();
        }
    }

    public async Task<IReadOnlyList<DemurrageBillingDto>> GetAllAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        await MaybeSyncExpiredBillingsAsync(cancellationToken);

        var query = BillingQueryWithIncludes();

        if (role == RoleNames.Trucker)
            query = query.Where(b => b.TruckerId == userId);
        else if (role == RoleNames.ShippingLineEvaluator)
        {
            var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
            if (user.ShippingLineId.HasValue)
                query = query.Where(b => b.ShippingLineId == user.ShippingLineId);
        }

        var items = await query.OrderByDescending(b => b.CreatedAt).ToListAsync(cancellationToken);
        return items.Select(MapToDto).ToList();
    }

    public async Task<int> GetPaymentDueCountAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.Trucker)
            return 0;

        await MaybeSyncExpiredBillingsAsync(cancellationToken);

        return await _db.DemurrageBillings.CountAsync(
            b => b.TruckerId == userId && b.Status == PaymentStatus.Pending,
            cancellationToken);
    }

    public async Task<DemurrageBillingDto?> GetByIdAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        await MaybeSyncExpiredBillingsAsync(cancellationToken);

        var billing = await BillingQueryWithIncludes()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (billing is null)
            return null;

        if (!await CanAccessBillingAsync(billing, userId, role, cancellationToken))
            return null;

        return MapToDto(billing);
    }

    public async Task<IReadOnlyList<EligibleDemurragePreAdviceDto>> GetEligiblePreAdvicesAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new InvalidOperationException("Only shipping line evaluators can create demurrage billing.");

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.ShippingLineId.HasValue)
            return Array.Empty<EligibleDemurragePreAdviceDto>();

        var today = PhilippinesTime.Today;
        var shippingLineId = user.ShippingLineId.Value;

        var billedPreAdviceIds = await _db.DemurrageBillings
            .Select(b => b.PreAdviceId)
            .ToListAsync(cancellationToken);
        var billedSet = billedPreAdviceIds.ToHashSet();

        var preAdvices = await _db.PreAdvices
            .Include(p => p.Trucker)
            .Include(p => p.Schedule!)
                .ThenInclude(s => s.QRBooking)
            .Where(p =>
                p.ShippingLineId == shippingLineId
                && p.Status == PreAdviceStatus.Approved
                && p.DemurrageValidUntil != null
                && p.DemurrageValidUntil < today
                && !billedPreAdviceIds.Contains(p.Id))
            .OrderByDescending(p => p.DemurrageValidUntil)
            .ToListAsync(cancellationToken);

        return preAdvices
            .Where(p => !billedSet.Contains(p.Id) && !IsSuccessfullyReturned(p))
            .Select(p =>
            {
                var validUntil = p.DemurrageValidUntil!.Value;
                var daysOverdue = Math.Max(0, today.DayNumber - validUntil.DayNumber);
                return new EligibleDemurragePreAdviceDto(
                    p.Id,
                    p.ReferenceNo,
                    p.Container?.ContainerNo ?? p.ContainerNoNormalized,
                    p.Trucker.FullName ?? p.Trucker.Username,
                    validUntil.ToString("yyyy-MM-dd"),
                    daysOverdue);
            })
            .ToList();
    }

    public async Task<DemurrageBillingDto> CreateAsync(
        CreateDemurrageBillingRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new InvalidOperationException("Only shipping line evaluators can create demurrage billing.");

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);
        if (!user.ShippingLineId.HasValue)
            throw new InvalidOperationException("Your account is not linked to a shipping line.");

        var preAdvice = await _db.PreAdvices
            .Include(p => p.Schedule!)
                .ThenInclude(s => s.QRBooking)
            .FirstOrDefaultAsync(p => p.Id == request.PreAdviceId, cancellationToken)
            ?? throw new InvalidOperationException("Pre-forecast not found.");

        if (preAdvice.ShippingLineId != user.ShippingLineId)
            throw new InvalidOperationException("Pre-forecast does not belong to your shipping line.");

        if (preAdvice.Status != PreAdviceStatus.Approved)
            throw new InvalidOperationException("Only approved pre-forecast can be billed.");

        if (preAdvice.DemurrageValidUntil is null)
            throw new InvalidOperationException("Pre-forecast has no demurrage validity date.");

        var today = PhilippinesTime.Today;
        if (preAdvice.DemurrageValidUntil >= today)
            throw new InvalidOperationException("Demurrage validity has not expired yet.");

        if (IsSuccessfullyReturned(preAdvice))
            throw new InvalidOperationException("Container was already successfully returned.");

        var existing = await _db.DemurrageBillings
            .AnyAsync(b => b.PreAdviceId == preAdvice.Id, cancellationToken);
        if (existing)
            throw new InvalidOperationException("Demurrage billing already exists for this pre-forecast.");

        var demurrageFee = await _paymentSettings.GetDemurrageFeeAmountAsync(cancellationToken);
        var detentionFee = await _paymentSettings.GetDetentionFeeAmountAsync(cancellationToken);
        var feeInputs = request.FeeLines is { Count: > 0 }
            ? request.FeeLines
            : BuildDefaultFeeInputs(demurrageFee, detentionFee);

        ValidateFeeInputs(feeInputs);

        var billing = new DemurrageBilling
        {
            ReferenceNo = await GenerateReferenceNoAsync(cancellationToken),
            PreAdviceId = preAdvice.Id,
            ShippingLineId = preAdvice.ShippingLineId,
            TruckerId = preAdvice.TruckerId,
            ContainerNoNormalized = preAdvice.ContainerNoNormalized,
            ContainerSizeId = preAdvice.ContainerSizeId,
            ContainerTypeId = preAdvice.ContainerTypeId,
            DemurrageValidUntil = preAdvice.DemurrageValidUntil.Value,
            ExpiredOn = today,
            DemurrageAmount = demurrageFee,
            DetentionAmount = detentionFee,
            Status = PaymentStatus.Pending,
        };
        ApplyFeeLines(billing, feeInputs);
        SyncLegacyAmounts(billing);

        _db.Add(billing);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "DemurrageBilling", billing.ReferenceNo, cancellationToken);

        if (billing.TruckerId > 0)
        {
            var total = billing.FeeLines.Sum(l => l.Amount);
            await _notifications.NotifyUsersAsync(
                new[] { billing.TruckerId },
                "Demurrage billing created",
                $"{preAdvice.ReferenceNo} — ₱{total:N0} demurrage charges are due.",
                "DemurrageBilling",
                "/trucker/demurrage-billing",
                userId,
                billing.ReferenceNo,
                cancellationToken);
        }

        return MapToDto(await ReloadBillingAsync(billing.Id, cancellationToken));
    }

    public async Task<DemurrageBillingDto?> UpdateFeesAsync(
        int id,
        UpdateDemurrageBillingFeesRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role != RoleNames.ShippingLineEvaluator)
            throw new InvalidOperationException("Only shipping line evaluators can edit demurrage fees.");

        ValidateFeeInputs(request.FeeLines);

        var billing = await BillingQueryWithIncludes()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (billing is null)
            return null;

        if (!await CanAccessBillingAsync(billing, userId, role, cancellationToken))
            return null;

        if (billing.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot edit fees on a paid billing.");

        if (billing.Status == PaymentStatus.ForVerification)
            throw new InvalidOperationException("Cannot edit fees while payment is under verification.");

        var hadProof = billing.Status is PaymentStatus.ForVerification or PaymentStatus.Rejected
            || billing.ProofFile is not null;

        billing.FeeLines.Clear();
        ApplyFeeLines(billing, request.FeeLines);
        SyncLegacyAmounts(billing);

        if (billing.Status == PaymentStatus.Rejected || hadProof)
        {
            billing.Status = PaymentStatus.Pending;
            billing.ProofFile = null;
            billing.ProofReferenceNo = null;
            billing.ProofTransactionAt = null;
            billing.PaidAt = null;
        }

        _db.Update(billing);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "UpdateFees", "DemurrageBilling", billing.ReferenceNo, cancellationToken);

        if (billing.TruckerId > 0)
        {
            var total = billing.FeeLines.Sum(l => l.Amount);
            await _notifications.NotifyUsersAsync(
                new[] { billing.TruckerId },
                "Demurrage billing updated",
                $"{billing.PreAdvice.ReferenceNo} — updated total ₱{total:N0}. Review and pay if due.",
                "DemurrageBilling",
                "/trucker/demurrage-billing",
                userId,
                billing.ReferenceNo,
                cancellationToken);
        }

        return MapToDto(billing);
    }

    public async Task<DemurrageBlockCheckDto> CheckBlockAsync(
        int truckerId,
        string containerNo,
        int shippingLineId,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeContainerNo(containerNo);
        var billing = await _db.DemurrageBillings
            .AsNoTracking()
            .Include(b => b.FeeLines)
            .Include(b => b.PreAdvice)
            .Include(b => b.ShippingLine)
            .Include(b => b.Trucker)
            .Include(b => b.ContainerSize)
            .Include(b => b.ContainerType)
            .Where(b =>
                b.TruckerId == truckerId
                && b.ContainerNoNormalized == normalized
                && b.ShippingLineId == shippingLineId
                && b.ContainerSizeId == containerSizeId
                && b.ContainerTypeId == containerTypeId
                && b.Status != PaymentStatus.Paid)
            .OrderByDescending(b => b.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (billing is null)
            return new DemurrageBlockCheckDto(false, null, null);

        var dto = MapToDto(billing);
        return new DemurrageBlockCheckDto(
            true,
            $"Container {billing.ContainerNoNormalized} has expired demurrage validity ({billing.DemurrageValidUntil:yyyy-MM-dd}). " +
            $"Settle demurrage charges (₱{dto.TotalAmount:N0}) before submitting a new pre-forecast.",
            dto);
    }

    public async Task EnsureTruckerCanCreatePreAdviceAsync(
        int truckerId,
        string containerNo,
        int shippingLineId,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default)
    {
        var block = await CheckBlockAsync(
            truckerId,
            containerNo,
            shippingLineId,
            containerSizeId,
            containerTypeId,
            cancellationToken);

        if (block.IsBlocked)
            throw new InvalidOperationException(block.Message ?? "Outstanding demurrage charges must be settled first.");
    }

    public async Task<DemurrageBillingDto> UploadProofAsync(
        int billingId,
        int truckerId,
        string proofFilePath,
        string? absoluteProofPath,
        string? proofReferenceNo,
        DateTime? proofTransactionAt,
        CancellationToken cancellationToken = default)
    {
        var billing = await BillingQueryWithIncludes()
            .FirstOrDefaultAsync(b => b.Id == billingId && b.TruckerId == truckerId, cancellationToken)
            ?? throw new InvalidOperationException("Demurrage billing not found.");

        if (billing.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("This demurrage billing is already paid.");

        billing.ProofFile = proofFilePath;
        billing.Status = PaymentStatus.ForVerification;
        billing.PaidAt = PhilippinesTime.UtcNow;
        ApplyProofMetadata(billing, proofReferenceNo, proofTransactionAt);

        if (billing.ProofReferenceNo is null
            && billing.ProofTransactionAt is null
            && !string.IsNullOrWhiteSpace(absoluteProofPath))
        {
            var extracted = await _proofExtraction.ExtractFromImageAsync(absoluteProofPath, cancellationToken);
            ApplyProofMetadata(billing, extracted.ReferenceNo, extracted.TransactionAt);
        }

        _db.Update(billing);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(truckerId, "UploadProof", "DemurrageBilling", billing.ReferenceNo, cancellationToken);

        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);
        var total = GetTotalAmount(billing);
        await _notifications.NotifyUsersAsync(
            adminIds,
            "Demurrage payment proof uploaded",
            $"{billing.PreAdvice.ReferenceNo} — ₱{total:N0} demurrage charges awaiting verification.",
            "DemurrageBilling",
            "/admin/payments",
            truckerId,
            billing.ReferenceNo,
            cancellationToken);

        return MapToDto(billing);
    }

    public async Task<DemurrageBillingDto?> VerifyAsync(
        int id,
        VerifyDemurrageBillingRequest request,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var billing = await BillingQueryWithIncludes()
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (billing is null)
            return null;

        billing.ProofReferenceNo = PaymentProofTextParser.NormalizeReferenceNo(request.ProofReferenceNo);
        billing.ProofTransactionAt = request.ProofTransactionAt;
        billing.Status = request.Approved ? PaymentStatus.Paid : PaymentStatus.Rejected;
        if (request.Approved)
            billing.PaidAt = PhilippinesTime.UtcNow;

        _db.Update(billing);
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            actorUserId,
            request.Approved ? "Approve" : "Reject",
            "DemurrageBilling",
            billing.ReferenceNo,
            cancellationToken);

        if (billing.TruckerId > 0)
        {
            await _notifications.NotifyUsersAsync(
                new[] { billing.TruckerId },
                request.Approved ? "Demurrage payment approved" : "Demurrage payment rejected",
                request.Approved
                    ? $"{billing.PreAdvice.ReferenceNo} demurrage charges verified. You may submit a new pre-forecast for this container."
                    : $"{billing.PreAdvice.ReferenceNo} demurrage payment was rejected. Upload a new proof.",
                "DemurrageBilling",
                "/trucker/demurrage-billing",
                actorUserId,
                billing.ReferenceNo,
                cancellationToken);
        }

        return MapToDto(billing);
    }

    private IQueryable<DemurrageBilling> BillingQueryWithIncludes() =>
        _db.DemurrageBillings
            .Include(b => b.PreAdvice)
                .ThenInclude(p => p.Container)
            .Include(b => b.ShippingLine)
            .Include(b => b.Trucker)
            .Include(b => b.ContainerSize)
            .Include(b => b.ContainerType)
            .Include(b => b.FeeLines);

    private async Task<DemurrageBilling> ReloadBillingAsync(int id, CancellationToken cancellationToken) =>
        await BillingQueryWithIncludes().FirstAsync(b => b.Id == id, cancellationToken);


    private async Task<bool> CanAccessBillingAsync(
        DemurrageBilling billing,
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

    private async Task<bool> EvaluatorOwnsShippingLineAsync(
        int userId,
        int shippingLineId,
        CancellationToken cancellationToken)
    {
        var user = await _db.Users.AsNoTracking().FirstAsync(u => u.Id == userId, cancellationToken);
        return user.ShippingLineId.HasValue && user.ShippingLineId.Value == shippingLineId;
    }

    private static bool IsSuccessfullyReturned(PreAdvice preAdvice)
    {
        var schedule = preAdvice.Schedule;
        if (schedule is null)
            return false;
        if (schedule.Status == ScheduleStatus.Completed)
            return true;
        return schedule.QRBooking?.IsUsed == true;
    }

    private static string NormalizeContainerNo(string containerNo) => containerNo.Trim().ToUpperInvariant();

    private sealed class ReferenceSequence
    {
        private int _seq;

        public ReferenceSequence(int startSequence) => _seq = startSequence;

        public string Next()
        {
            _seq++;
            return $"DMG-{PhilippinesTime.Today.Year}-{_seq:D6}";
        }
    }

    private async Task<ReferenceSequence> GetNextReferenceSequenceAsync(CancellationToken cancellationToken)
    {
        var year = PhilippinesTime.Today.Year;
        var prefix = $"DMG-{year}-";
        var last = await _db.DemurrageBillings
            .Where(b => b.ReferenceNo.StartsWith(prefix))
            .OrderByDescending(b => b.ReferenceNo)
            .Select(b => b.ReferenceNo)
            .FirstOrDefaultAsync(cancellationToken);

        var seq = 0;
        if (last is not null && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            seq = parsed;

        return new ReferenceSequence(seq);
    }

    private async Task<string> GenerateReferenceNoAsync(CancellationToken cancellationToken)
        => (await GetNextReferenceSequenceAsync(cancellationToken)).Next();

    private static void ApplyProofMetadata(DemurrageBilling billing, string? referenceNo, DateTime? transactionAt)
    {
        var normalizedRef = PaymentProofTextParser.NormalizeReferenceNo(referenceNo);
        if (normalizedRef is not null)
            billing.ProofReferenceNo = normalizedRef;
        if (transactionAt.HasValue)
            billing.ProofTransactionAt = transactionAt;
    }

    private static IReadOnlyList<DemurrageBillingFeeInput> BuildDefaultFeeInputs(decimal demurrageFee, decimal detentionFee)
    {
        var lines = new List<DemurrageBillingFeeInput>();
        if (demurrageFee > 0)
            lines.Add(new DemurrageBillingFeeInput("Demurrage", demurrageFee));
        if (detentionFee > 0)
            lines.Add(new DemurrageBillingFeeInput("Detention", detentionFee));
        return lines;
    }

    private static void ApplyDefaultFeeLines(DemurrageBilling billing, decimal demurrageFee, decimal detentionFee) =>
        ApplyFeeLines(billing, BuildDefaultFeeInputs(demurrageFee, detentionFee));

    private static void ApplyFeeLines(DemurrageBilling billing, IReadOnlyList<DemurrageBillingFeeInput> inputs)
    {
        var sort = 1;
        foreach (var input in inputs)
        {
            billing.FeeLines.Add(new DemurrageBillingFeeLine
            {
                Description = input.Description.Trim(),
                Amount = input.Amount,
                SortOrder = sort++,
            });
        }
    }

    private static void SyncLegacyAmounts(DemurrageBilling billing)
    {
        billing.DemurrageAmount = billing.FeeLines
            .FirstOrDefault(l => l.Description.Equals("Demurrage", StringComparison.OrdinalIgnoreCase))?.Amount
            ?? billing.FeeLines.FirstOrDefault()?.Amount
            ?? 0;
        billing.DetentionAmount = billing.FeeLines
            .FirstOrDefault(l => l.Description.Equals("Detention", StringComparison.OrdinalIgnoreCase))?.Amount
            ?? 0;
    }

    private static void ValidateFeeInputs(IReadOnlyList<DemurrageBillingFeeInput> feeLines)
    {
        if (feeLines is null || feeLines.Count == 0)
            throw new InvalidOperationException("At least one fee line is required.");

        foreach (var line in feeLines)
        {
            if (string.IsNullOrWhiteSpace(line.Description))
                throw new InvalidOperationException("Each fee line must have a description.");
            if (line.Amount <= 0)
                throw new InvalidOperationException("Each fee amount must be greater than zero.");
        }
    }

    private static decimal GetTotalAmount(DemurrageBilling b) =>
        b.FeeLines.Count > 0
            ? b.FeeLines.Sum(l => l.Amount)
            : b.DemurrageAmount + b.DetentionAmount;

    private static DemurrageBillingDto MapToDto(DemurrageBilling b)
    {
        var today = PhilippinesTime.Today;
        var daysOverdue = Math.Max(0, today.DayNumber - b.DemurrageValidUntil.DayNumber);
        var feeLines = b.FeeLines
            .OrderBy(l => l.SortOrder)
            .Select(l => new DemurrageBillingFeeLineDto(l.Id, l.Description, l.Amount, l.SortOrder))
            .ToList();

        if (feeLines.Count == 0)
        {
            if (b.DemurrageAmount > 0)
                feeLines.Add(new DemurrageBillingFeeLineDto(0, "Demurrage", b.DemurrageAmount, 1));
            if (b.DetentionAmount > 0)
                feeLines.Add(new DemurrageBillingFeeLineDto(0, "Detention", b.DetentionAmount, 2));
        }

        var total = feeLines.Sum(l => l.Amount);
        var demurrage = feeLines.FirstOrDefault(l => l.Description.Equals("Demurrage", StringComparison.OrdinalIgnoreCase))?.Amount ?? b.DemurrageAmount;
        var detention = feeLines.FirstOrDefault(l => l.Description.Equals("Detention", StringComparison.OrdinalIgnoreCase))?.Amount ?? b.DetentionAmount;

        return new DemurrageBillingDto(
            b.Id,
            b.ReferenceNo,
            b.PreAdviceId,
            b.PreAdvice.ReferenceNo,
            b.ShippingLineId,
            b.ShippingLine.Name,
            b.TruckerId,
            b.Trucker.FullName ?? b.Trucker.Username,
            b.PreAdvice.Container?.ContainerNo ?? b.ContainerNoNormalized,
            b.ContainerSize.Label,
            b.ContainerType.Code,
            b.DemurrageValidUntil.ToString("yyyy-MM-dd"),
            b.ExpiredOn.ToString("yyyy-MM-dd"),
            daysOverdue,
            demurrage,
            detention,
            total,
            feeLines,
            b.Status,
            b.ProofFile,
            b.ProofReferenceNo,
            b.ProofTransactionAt,
            b.PaidAt,
            b.CreatedAt);
    }
}
