using System.Text.Json;
using System.Text.RegularExpressions;
using ECMS.Application.DTOs.DepotGate;
using ECMS.Application.DTOs.QR;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public partial class DepotGateService : IDepotGateService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public DepotGateService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public Task<DepotGateScanResponse> ScanAsync(
        string rawQrCode,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
        => BuildScanResponseAsync(rawQrCode, userId, role, persistCheckIn: false, cancellationToken);

    public async Task<DepotGateCheckInResponse> CheckInAsync(
        string rawQrCode,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var qrRef = NormalizeQrReference(rawQrCode);
        if (qrRef is null)
        {
            return new DepotGateCheckInResponse(
                false,
                "Enter a valid ICS booking QR reference.",
                new DepotGateScanResponse(
                    false,
                    "Enter a valid ICS booking QR reference.",
                    null,
                    false,
                    false,
                    null,
                    null,
                    Array.Empty<DepotGateIssueDto>()));
        }

        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.QRCode == qrRef, cancellationToken);

        if (booking is null)
        {
            return new DepotGateCheckInResponse(
                false,
                "Booking reference not found.",
                new DepotGateScanResponse(
                    false,
                    "Booking reference not found.",
                    qrRef,
                    false,
                    false,
                    null,
                    null,
                    Array.Empty<DepotGateIssueDto>()));
        }

        if (!await CanAccessDepotGateAsync(booking, userId, role, cancellationToken))
        {
            return new DepotGateCheckInResponse(
                false,
                "This booking is assigned to a different container yard.",
                await BuildScanResponseAsync(rawQrCode, userId, role, persistCheckIn: false, cancellationToken));
        }

        if (booking.GateCheckedInAt.HasValue)
        {
            var existing = await BuildScanResponseAsync(rawQrCode, userId, role, persistCheckIn: false, cancellationToken);
            return new DepotGateCheckInResponse(
                true,
                "Trucker was already checked in at the gate.",
                existing);
        }

        var issues = BuildValidationIssues(booking, role, depotAccessDenied: false);
        if (issues.Any(i => string.Equals(i.Severity, "error", StringComparison.OrdinalIgnoreCase)))
        {
            var blocked = await BuildScanResponseAsync(rawQrCode, userId, role, persistCheckIn: false, cancellationToken);
            return new DepotGateCheckInResponse(
                false,
                blocked.Message ?? "QR is not valid for gate check-in.",
                blocked);
        }

        booking.GateCheckedInAt = PhilippinesTime.UtcNow;
        booking.GateCheckedInByUserId = userId;
        if (booking.Schedule.Status == ScheduleStatus.Confirmed)
            booking.Schedule.Status = ScheduleStatus.Completed;

        await _db.SaveChangesAsync(cancellationToken);

        var preAdvice = booking.Schedule.PreAdvice;
        await _auditService.LogAsync(
            userId,
            "DEPOT_GATE_CHECKIN",
            "QR",
            $"Gate check-in for QR {booking.QRCode} — container {preAdvice.Container.ContainerNo} at {booking.Schedule.Depot.Name}.",
            cancellationToken);

        var scan = await BuildScanResponseAsync(rawQrCode, userId, role, persistCheckIn: false, cancellationToken);
        return new DepotGateCheckInResponse(true, "Trucker checked in for empty return.", scan);
    }

    private async Task<DepotGateScanResponse> BuildScanResponseAsync(
        string rawQrCode,
        int userId,
        string role,
        bool persistCheckIn,
        CancellationToken cancellationToken)
    {
        _ = persistCheckIn;

        var qrRef = NormalizeQrReference(rawQrCode);
        if (qrRef is null)
        {
            return new DepotGateScanResponse(
                false,
                "Enter a valid ICS booking QR reference.",
                null,
                false,
                false,
                null,
                null,
                Array.Empty<DepotGateIssueDto>());
        }

        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.QRCode == qrRef, cancellationToken);

        if (booking is null)
        {
            return new DepotGateScanResponse(
                false,
                "Booking reference not found.",
                qrRef,
                false,
                false,
                null,
                null,
                Array.Empty<DepotGateIssueDto>());
        }

        var depotAccessDenied = !await CanAccessDepotGateAsync(booking, userId, role, cancellationToken);
        var issues = BuildValidationIssues(booking, role, depotAccessDenied);
        var alreadyCheckedIn = booking.GateCheckedInAt.HasValue;
        var hasErrors = issues.Any(i => string.Equals(i.Severity, "error", StringComparison.OrdinalIgnoreCase));
        var canCheckIn = !hasErrors && !alreadyCheckedIn;

        string? message = null;
        if (depotAccessDenied)
            message = "This booking is assigned to a different container yard.";
        else if (alreadyCheckedIn)
            message = "Trucker already checked in at the gate.";
        else if (hasErrors)
            message = "QR is not valid for empty return. Trucker must file a new pre-forecast.";
        else
            message = "QR is valid. Review the pre-forecast dossier and accept the trucker.";

        return new DepotGateScanResponse(
            true,
            message,
            booking.QRCode,
            canCheckIn,
            alreadyCheckedIn,
            booking.GateCheckedInAt,
            booking.GateCheckedInBy?.FullName ?? booking.GateCheckedInBy?.Username,
            issues);
    }

    private static List<DepotGateIssueDto> BuildValidationIssues(
        Domain.Entities.QRBooking booking,
        string role,
        bool depotAccessDenied)
    {
        var issues = new List<DepotGateIssueDto>();
        var schedule = booking.Schedule;
        var preAdvice = schedule.PreAdvice;
        var today = PhilippinesTime.Today;

        if (depotAccessDenied)
        {
            issues.Add(new DepotGateIssueDto(
                "WRONG_DEPOT",
                "error",
                $"This return is booked for {schedule.Depot.Name}, not your assigned container yard."));
            return issues;
        }

        if (booking.GateCheckedInAt.HasValue)
        {
            issues.Add(new DepotGateIssueDto(
                "ALREADY_CHECKED_IN",
                "info",
                "Trucker was already checked in at the gate."));
        }

        if (preAdvice.DemurrageValidUntil.HasValue && preAdvice.DemurrageValidUntil.Value < today)
        {
            issues.Add(new DepotGateIssueDto(
                "FREE_TIME_EXPIRED",
                "error",
                $"CRO free time expired on {preAdvice.DemurrageValidUntil:yyyy-MM-dd}. Trucker must file a new pre-forecast."));
        }

        if (schedule.Date < today)
        {
            issues.Add(new DepotGateIssueDto(
                "SCHEDULE_DATE_PASSED",
                "error",
                $"Booked return date was {schedule.Date:yyyy-MM-dd}. Trucker must file a new pre-forecast."));
        }
        else if (schedule.Date > today)
        {
            issues.Add(new DepotGateIssueDto(
                "EARLY_ARRIVAL",
                "warning",
                $"Booked return date is {schedule.Date:yyyy-MM-dd}. Trucker arrived early — confirm before accepting."));
        }

        if (preAdvice.Status != PreAdviceStatus.Approved)
        {
            issues.Add(new DepotGateIssueDto(
                "PRE_ADVICE_NOT_APPROVED",
                "error",
                $"Pre-forecast status is {preAdvice.Status}. Only approved pre-forecasts can enter."));
        }

        var payment = schedule.Payment;
        if (payment is null || payment.Status != PaymentStatus.Paid)
        {
            issues.Add(new DepotGateIssueDto(
                "PAYMENT_NOT_VERIFIED",
                "error",
                "Payment has not been verified. QR cannot be used for gate check-in."));
        }

        if (schedule.Status is not ScheduleStatus.Confirmed and not ScheduleStatus.Completed)
        {
            issues.Add(new DepotGateIssueDto(
                "SCHEDULE_NOT_CONFIRMED",
                "error",
                $"Return schedule status is {schedule.Status}. Booking must be confirmed after payment."));
        }

        return issues;
    }

    private async Task<bool> CanAccessDepotGateAsync(
        Domain.Entities.QRBooking booking,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        var normalized = RoleNames.NormalizeTransactionRole(role);
        if (string.Equals(normalized, RoleNames.Administrator, StringComparison.OrdinalIgnoreCase))
            return true;

        if (!string.Equals(normalized, RoleNames.DepotPersonnel, StringComparison.OrdinalIgnoreCase))
            return false;

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user?.DepotId is null)
            return true;

        return booking.Schedule.DepotId == user.DepotId.Value;
    }

    private IQueryable<Domain.Entities.QRBooking> LoadBookingQuery()
        => _db.QRBookings
            .Include(x => x.GateCheckedInBy)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(x => x.Schedule).ThenInclude(s => s.Depot)
            .Include(x => x.Schedule).ThenInclude(s => s.Trucker)
            .Include(x => x.Schedule).ThenInclude(s => s.Payment);

    private static string? NormalizeQrReference(string raw)
    {
        var trimmed = raw.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return null;

        if (trimmed.StartsWith("{", StringComparison.Ordinal))
        {
            try
            {
                var payload = JsonSerializer.Deserialize<QrPayloadDto>(trimmed);
                if (!string.IsNullOrWhiteSpace(payload?.BookingId))
                    return payload.BookingId.Trim();
            }
            catch (JsonException)
            {
                // Fall through to plain reference parsing.
            }
        }

        var icsMatch = IcsReferenceRegex().Match(trimmed);
        if (icsMatch.Success)
            return icsMatch.Value.ToUpperInvariant();

        return trimmed;
    }

    [GeneratedRegex(@"ICS-\d+", RegexOptions.IgnoreCase)]
    private static partial Regex IcsReferenceRegex();
}
