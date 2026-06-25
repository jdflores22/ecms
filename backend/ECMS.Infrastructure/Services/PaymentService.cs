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

    public PaymentService(
        IEcmsDbContext db,
        IQrService qrService,
        IAuditService auditService,
        INotificationService notifications,
        IPaymentSettingsService paymentSettings)
    {
        _db = db;
        _qrService = qrService;
        _auditService = auditService;
        _notifications = notifications;
        _paymentSettings = paymentSettings;
    }

    public async Task<PaymentDto> UploadProofAsync(UploadPaymentRequest request, int truckerId, string proofFilePath, CancellationToken cancellationToken = default)
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

        if (payment.Id == 0)
            _db.Add(payment);
        else
            _db.Update(payment);

        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(truckerId, "UploadProof", "Payment", $"Schedule {request.ScheduleId}", cancellationToken);

        var depotIds = await NotificationService.DepotPersonnelIdsAsync(_db, schedule.DepotId, cancellationToken);
        var adminIds = await NotificationService.AdministratorIdsAsync(_db, cancellationToken);
        await _notifications.NotifyUsersAsync(
            depotIds.Concat(adminIds),
            "Payment proof uploaded",
            $"{schedule.PreAdvice.ReferenceNo} — ₱{configuredAmount:N0} awaiting verification.",
            "Payment",
            "/depot/payments",
            truckerId,
            schedule.PreAdvice.ReferenceNo,
            cancellationToken);

        payment.Trucker = await _db.Users.FirstAsync(u => u.Id == truckerId, cancellationToken);
        return MapToDto(payment);
    }

    public async Task<PaymentStatusDto?> GetStatusAsync(int id, CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        return payment is null ? null : new PaymentStatusDto(payment.Id, payment.Status, payment.ProofFile);
    }

    public async Task<PaymentDto?> VerifyAsync(int id, bool approved, int actorUserId, CancellationToken cancellationToken = default)
    {
        var payment = await _db.Payments
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice)
            .Include(p => p.Trucker)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payment is null) return null;

        payment.Status = approved ? PaymentStatus.Paid : PaymentStatus.Rejected;
        if (approved)
        {
            payment.Schedule.Status = ScheduleStatus.Confirmed;
            _db.Update(payment.Schedule);
            await _qrService.GenerateForScheduleAsync(payment.ScheduleId, cancellationToken);
        }

        _db.Update(payment);
        await _db.SaveChangesAsync(cancellationToken);

        var refNo = payment.Schedule.PreAdvice.ReferenceNo;
        await _auditService.LogAsync(
            actorUserId,
            approved ? "Approve" : "Reject",
            "Payment",
            $"{refNo} · schedule {payment.ScheduleId}",
            cancellationToken);

        if (payment.TruckerId > 0)
        {
            var paymentLink = $"/trucker/payments/{payment.ScheduleId}";
            await _notifications.NotifyUsersAsync(
                new[] { payment.TruckerId },
                approved ? "Payment approved — return confirmed" : "Payment rejected",
                approved
                    ? $"{refNo} payment verified. Your return is confirmed — view payment details and download your LOGICTECK booking QR."
                    : $"{refNo} payment was rejected. Upload a new proof on the payment page.",
                "Payment",
                paymentLink,
                actorUserId,
                refNo,
                cancellationToken);
        }

        return MapToDto(payment);
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

    private static PaymentDto MapToDto(Payment p) => new(
        p.Id, p.ScheduleId, p.TruckerId, p.Trucker.FullName ?? p.Trucker.Username,
        p.Amount, p.ProofFile, p.Status, p.PaidAt);
}
