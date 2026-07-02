using ECMS.Application.DTOs.Payment;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly IEcmsDbContext _db;
    private readonly IQrService _qrService;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notifications;
    private readonly IPaymentSettingsService _paymentSettings;
    private readonly IPaymentProofExtractionService _proofExtraction;

    public PaymentService(
        IEcmsDbContext db,
        IQrService qrService,
        IAuditService auditService,
        INotificationService notifications,
        IPaymentSettingsService paymentSettings,
        IPaymentProofExtractionService proofExtraction)
    {
        _db = db;
        _qrService = qrService;
        _auditService = auditService;
        _notifications = notifications;
        _paymentSettings = paymentSettings;
        _proofExtraction = proofExtraction;
    }

    public async Task<PaymentDto> UploadProofAsync(
        UploadPaymentRequest request,
        int truckerId,
        string proofFilePath,
        string? absoluteProofPath = null,
        CancellationToken cancellationToken = default)
    {
        var schedule = await _db.Schedules
            .Include(s => s.PreAdvice)
            .FirstOrDefaultAsync(s => s.Id == request.ScheduleId && s.TruckerId == truckerId, cancellationToken)
            ?? throw new InvalidOperationException("Schedule not found.");

        var configuredAmount = await _paymentSettings.GetReturnFeeAmountAsync(cancellationToken);

        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.ScheduleId == request.ScheduleId, cancellationToken)
            ?? new Payment { ScheduleId = request.ScheduleId, TruckerId = truckerId };

        payment.Amount = configuredAmount;
        payment.ProofFile = proofFilePath;
        payment.Status = PaymentStatus.ForVerification;
        payment.PaidAt = PhilippinesTime.UtcNow;
        ApplyProofMetadata(
            payment,
            request.ProofReferenceNo,
            request.ProofTransactionAt,
            request.ProofProvider,
            request.ProofQrphInvoiceNo);

        if (payment.ProofReferenceNo is null
            && payment.ProofTransactionAt is null
            && payment.ProofProvider is null
            && payment.ProofQrphInvoiceNo is null
            && !string.IsNullOrWhiteSpace(absoluteProofPath))
        {
            var extracted = await _proofExtraction.ExtractFromImageAsync(absoluteProofPath, cancellationToken);
            var parsed = new PaymentProofMetadata(
                extracted.ReferenceNo,
                extracted.QrphInvoiceNo,
                extracted.TransactionAt,
                extracted.Provider);
            var transactionAt = PaymentProofTextParser.ResolveReceiptDateFallback(parsed, payment.PaidAt);
            ApplyProofMetadata(
                payment,
                extracted.ReferenceNo,
                transactionAt,
                extracted.Provider,
                extracted.QrphInvoiceNo);
        }

        if (payment.Id == 0)
            _db.Add(payment);
        else
            _db.Update(payment);

        _auditService.QueueLog(truckerId, "UploadProof", "Payment", $"Schedule {request.ScheduleId}");
        await _db.SaveChangesAsync(cancellationToken);

        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);
        await _notifications.NotifyUsersAsync(
            adminIds,
            "Payment proof uploaded",
            $"{schedule.PreAdvice.ReferenceNo} — ₱{configuredAmount:N0} awaiting verification.",
            "Payment",
            "/admin/payments",
            truckerId,
            schedule.PreAdvice.ReferenceNo,
            cancellationToken);

        payment.Trucker = await _db.Users.FirstAsync(u => u.Id == truckerId, cancellationToken);
        return MapToDto(payment);
    }

    public async Task<PaymentStatusDto?> GetStatusAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payment is null)
            return null;

        var allowed = role switch
        {
            RoleNames.Administrator => true,
            RoleNames.Trucker => payment.TruckerId == userId
                || payment.Schedule.PreAdvice.TruckerId == userId,
            _ => false,
        };

        if (!allowed)
            return null;

        return new PaymentStatusDto(payment.Id, payment.Status, payment.ProofFile);
    }

    public async Task<PaymentDto?> VerifyAsync(
        int id,
        VerifyPaymentRequest request,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice)
            .Include(p => p.Trucker)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payment is null) return null;

        payment.ProofReferenceNo = PaymentProofTextParser.NormalizeReferenceNo(request.ProofReferenceNo);
        payment.ProofTransactionAt = request.ProofTransactionAt;
        payment.ProofQrphInvoiceNo = PaymentProofTextParser.NormalizeQrphInvoiceNo(request.ProofQrphInvoiceNo);
        if (request.ProofProvider is not null)
            payment.ProofProvider = PaymentProofTextParser.NormalizeProvider(request.ProofProvider);

        payment.Status = request.Approved ? PaymentStatus.Paid : PaymentStatus.Rejected;
        if (request.Approved)
        {
            payment.PaidAt = PhilippinesTime.UtcNow;
            payment.Schedule.Status = ScheduleStatus.Confirmed;
            _db.Update(payment.Schedule);
            await _qrService.GenerateForScheduleAsync(payment.ScheduleId, actorUserId, RoleNames.Administrator, cancellationToken);
        }

        _db.Update(payment);
        _auditService.QueueLog(
            actorUserId,
            request.Approved ? "Approve" : "Reject",
            "Payment",
            $"{payment.Schedule.PreAdvice.ReferenceNo} · schedule {payment.ScheduleId}");
        await _db.SaveChangesAsync(cancellationToken);

        var refNo = payment.Schedule.PreAdvice.ReferenceNo;

        if (payment.TruckerId > 0)
        {
            var paymentLink = $"/trucker/payments/{payment.ScheduleId}";
            await _notifications.NotifyUsersAsync(
                new[] { payment.TruckerId },
                request.Approved ? "Payment approved — return confirmed" : "Payment rejected",
                request.Approved
                    ? $"{refNo} payment verified. Your return is confirmed — view your pre-forecast QR and send to LOGICTECK when ready."
                    : $"{refNo} payment was rejected. Upload a new proof on the payment page.",
                "Payment",
                paymentLink,
                actorUserId,
                refNo,
                cancellationToken);
        }

        return MapToDto(payment);
    }

    public async Task<PaymentDto?> UpdateProofMetadataAsync(
        int id,
        UpdatePaymentProofMetadataRequest request,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments
            .Include(p => p.Trucker)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payment is null) return null;

        payment.ProofReferenceNo = PaymentProofTextParser.NormalizeReferenceNo(request.ProofReferenceNo);
        payment.ProofTransactionAt = request.ProofTransactionAt;
        payment.ProofQrphInvoiceNo = PaymentProofTextParser.NormalizeQrphInvoiceNo(request.ProofQrphInvoiceNo);
        if (request.ProofProvider is not null)
            payment.ProofProvider = PaymentProofTextParser.NormalizeProvider(request.ProofProvider);
        _db.Update(payment);
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            actorUserId,
            "Update",
            "Payment",
            $"Proof metadata · schedule {payment.ScheduleId}",
            cancellationToken);

        return MapToDto(payment);
    }

    public async Task<PaymentDto?> ExtractProofMetadataAsync(
        int id,
        string contentRoot,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments
            .Include(p => p.Trucker)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payment is null || string.IsNullOrWhiteSpace(payment.ProofFile))
            return null;

        var absoluteProofPath = ResolveProofAbsolutePath(contentRoot, payment.ProofFile);
        if (absoluteProofPath is null)
            return null;

        var extracted = await _proofExtraction.ExtractFromImageAsync(absoluteProofPath, cancellationToken);
        var parsed = new PaymentProofMetadata(
            extracted.ReferenceNo,
            extracted.QrphInvoiceNo,
            extracted.TransactionAt,
            extracted.Provider);
        var transactionAt = PaymentProofTextParser.ResolveReceiptDateFallback(parsed, payment.PaidAt);
        ApplyProofMetadata(
            payment,
            extracted.ReferenceNo,
            transactionAt,
            extracted.Provider,
            extracted.QrphInvoiceNo);
        _db.Update(payment);
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            actorUserId,
            "ExtractProof",
            "Payment",
            $"Proof OCR · schedule {payment.ScheduleId}",
            cancellationToken);

        return MapToDto(payment);
    }

    public async Task<PaymentProofFileInfo?> GetProofFileAsync(
        int id,
        string contentRoot,
        CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payment is null || string.IsNullOrWhiteSpace(payment.ProofFile))
            return null;

        var absoluteProofPath = ResolveProofAbsolutePath(contentRoot, payment.ProofFile);
        if (absoluteProofPath is null || !File.Exists(absoluteProofPath))
            return null;

        return new PaymentProofFileInfo(
            absoluteProofPath,
            GuessProofContentType(absoluteProofPath),
            Path.GetFileName(absoluteProofPath));
    }

    public async Task<IReadOnlyList<PaymentDto>> GetByTruckerAsync(int truckerId, CancellationToken cancellationToken = default)
    {
        var items = await _db.Payments
            .Include(p => p.Trucker)
            .Where(p => p.TruckerId == truckerId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<PaymentDto>> GetPendingVerificationAsync(int? depotId, CancellationToken cancellationToken = default)
    {
        var query = _db.Payments
            .Include(p => p.Trucker)
            .Include(p => p.Schedule)
            .Where(p => p.Status == PaymentStatus.ForVerification);

        if (depotId.HasValue)
            query = query.Where(p => p.Schedule.DepotId == depotId);

        var items = await query.OrderBy(p => p.PaidAt).ToListAsync(cancellationToken);
        return items.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<PaymentDto>> GetForDepotAsync(int? depotId, CancellationToken cancellationToken = default)
    {
        var query = _db.Payments
            .Include(p => p.Trucker)
            .Include(p => p.Schedule)
            .Where(p => p.Status == PaymentStatus.Paid || p.Status == PaymentStatus.Rejected);

        if (depotId.HasValue)
            query = query.Where(p => p.Schedule.DepotId == depotId);

        var items = await query
            .OrderByDescending(p => p.PaidAt ?? p.CreatedAt)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<PaymentDto?> GetByScheduleAsync(
        int scheduleId,
        int userId,
        string role,
        int? depotId,
        int? shippingLineId,
        CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments
            .Include(p => p.Trucker)
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice)
            .FirstOrDefaultAsync(p => p.ScheduleId == scheduleId, cancellationToken);

        if (payment is null) return null;

        var allowed = role switch
        {
            RoleNames.Administrator => true,
            RoleNames.DepotPersonnel => depotId.HasValue && payment.Schedule.DepotId == depotId.Value,
            RoleNames.Trucker => payment.TruckerId == userId
                || payment.Schedule.PreAdvice.TruckerId == userId,
            RoleNames.ShippingLineEvaluator => shippingLineId.HasValue
                && payment.Schedule.PreAdvice.ShippingLineId == shippingLineId.Value,
            _ => false,
        };

        if (!allowed) return null;

        return MapToDto(payment);
    }

    public Task<int> GetPendingVerificationCountAsync(CancellationToken cancellationToken = default) =>
        _db.Payments.CountAsync(p => p.Status == PaymentStatus.ForVerification, cancellationToken);

    public async Task<int> GetPaymentDueCountAsync(int truckerId, CancellationToken cancellationToken = default)
    {
        var schedules = await _db.Schedules
            .AsNoTracking()
            .Include(s => s.Payment)
            .Where(s => s.TruckerId == truckerId)
            .Where(s => s.Status == ScheduleStatus.Scheduled || s.Status == ScheduleStatus.Confirmed)
            .ToListAsync(cancellationToken);

        return schedules.Count(s =>
        {
            if (s.Payment is not null)
                return s.Payment.Status == PaymentStatus.Pending;

            return s.Status == ScheduleStatus.Scheduled;
        });
    }

    private static void ApplyProofMetadata(
        Payment payment,
        string? referenceNo,
        DateTime? transactionAt,
        string? provider = null,
        string? qrphInvoiceNo = null)
    {
        if (referenceNo is not null)
            payment.ProofReferenceNo = PaymentProofTextParser.NormalizeReferenceNo(referenceNo);

        if (qrphInvoiceNo is not null)
            payment.ProofQrphInvoiceNo = PaymentProofTextParser.NormalizeQrphInvoiceNo(qrphInvoiceNo);

        if (transactionAt.HasValue)
            payment.ProofTransactionAt = transactionAt.Value.Kind == DateTimeKind.Utc
                ? transactionAt
                : PhilippinesTime.ToUtcFromPhilippines(transactionAt.Value);

        if (provider is not null)
            payment.ProofProvider = PaymentProofTextParser.NormalizeProvider(provider);
    }

    private static string? ResolveProofAbsolutePath(string contentRoot, string proofFile)
    {
        if (string.IsNullOrWhiteSpace(proofFile))
            return null;

        var relative = proofFile.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(contentRoot, relative);
    }

    private static string GuessProofContentType(string absolutePath) =>
        Path.GetExtension(absolutePath).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream",
        };

    private static PaymentDto MapToDto(Payment p) => new(
        p.Id,
        p.ScheduleId,
        p.TruckerId,
        p.Trucker.FullName ?? p.Trucker.Username,
        p.Amount,
        p.ProofFile,
        p.ProofReferenceNo,
        p.ProofQrphInvoiceNo,
        p.ProofTransactionAt,
        p.ProofProvider,
        p.Status,
        p.PaidAt);
}
