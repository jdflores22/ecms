using System.Text.Json;
using ECMS.Application;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.QR;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QRCoder;

namespace ECMS.Infrastructure.Services;

public class QrCodeService : IQrService
{
    private readonly IEcmsDbContext _db;
    private readonly LogicteckOutboundClient _logicteckClient;
    private readonly LogicteckOptions _logicteckOptions;
    private readonly IAuditService _auditService;

    public QrCodeService(
        IEcmsDbContext db,
        LogicteckOutboundClient logicteckClient,
        IOptions<LogicteckOptions> logicteckOptions,
        IAuditService auditService)
    {
        _db = db;
        _logicteckClient = logicteckClient;
        _logicteckOptions = logicteckOptions.Value;
        _auditService = auditService;
    }

    public async Task<QrBookingDto?> GetByBookingIdAsync(int bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

        return booking is null ? null : MapToDto(booking);
    }

    public async Task<byte[]?> DownloadQrAsync(int bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await _db.QRBookings.FirstOrDefaultAsync(x => x.Id == bookingId, cancellationToken);
        if (booking is null) return null;

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(booking.PayloadJson, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        return png.GetGraphic(20);
    }

    public async Task<QrBookingDto> GenerateForScheduleAsync(int scheduleId, CancellationToken cancellationToken = default)
    {
        var schedule = await _db.Schedules
            .Include(x => x.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(x => x.PreAdvice).ThenInclude(p => p.Trucker)
            .Include(x => x.Depot)
            .Include(x => x.Trucker)
            .Include(x => x.QRBooking)
            .FirstOrDefaultAsync(x => x.Id == scheduleId, cancellationToken)
            ?? throw new InvalidOperationException("Schedule not found.");

        if (schedule.QRBooking is not null)
            return MapToDto(schedule.QRBooking);

        var bookingId = $"ICS-{PhilippinesTime.Year}{schedule.Id:D5}";
        var payload = BuildQrPayload(schedule, bookingId, qrBookingId: 0);
        var payloadJson = JsonSerializer.Serialize(payload);
        var booking = new Domain.Entities.QRBooking
        {
            ScheduleId = scheduleId,
            QRCode = bookingId,
            PayloadJson = payloadJson
        };

        _db.Add(booking);
        await _db.SaveChangesAsync(cancellationToken);

        booking.Schedule = schedule;
        payload = BuildQrPayload(schedule, bookingId, booking.Id);
        booking.PayloadJson = JsonSerializer.Serialize(payload);
        await _db.SaveChangesAsync(cancellationToken);

        if (_logicteckOptions.AutoTransferOnQrPublish)
        {
            await ExecuteTransferToLogicteckAsync(
                booking,
                schedule.PreAdvice.TruckerId,
                "LOGICTECK_AUTO_TRANSFER",
                cancellationToken);
        }

        return MapToDto(booking);
    }

    public async Task<QrBookingDto?> GetByScheduleIdAsync(int scheduleId, CancellationToken cancellationToken = default)
    {
        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.ScheduleId == scheduleId, cancellationToken);

        return booking is null ? null : MapToDto(booking);
    }

    public async Task<QrBookingDto?> GetByQrCodeAsync(
        string qrCode,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(qrCode)) return null;

        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.QRCode == qrCode.Trim(), cancellationToken);

        if (booking is null || !CanAccessBooking(booking, userId, role))
            return null;

        return MapToDto(booking);
    }

    public async Task<ValidateQrResponse> ValidateAsync(ValidateQrRequest request, CancellationToken cancellationToken = default)
    {
        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.QRCode == request.QrCode, cancellationToken);

        if (booking is null)
        {
            return new ValidateQrResponse(
                false,
                "Booking reference not found.",
                null, null, null, null, null, null, null, null);
        }

        if (booking.IsUsed)
        {
            return new ValidateQrResponse(
                false,
                "QR already retrieved by LOGICTECK.",
                booking.QRCode,
                booking.Schedule.PreAdvice.Container.ContainerNo,
                booking.Schedule.PreAdvice.ShippingLine.Code,
                booking.Schedule.Trucker?.FullName ?? booking.Schedule.Trucker?.Username,
                booking.Schedule.PreAdvice.ReferenceNo,
                booking.Schedule.Date.ToString("yyyy-MM-dd"),
                booking.Schedule.Time.ToString("HH:mm"),
                booking.Schedule.Depot.Name);
        }

        booking.IsUsed = true;
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            booking.Schedule.PreAdvice.TruckerId,
            "LOGICTECK_VALIDATE_QR",
            "QR",
            $"QR {booking.QRCode} validated for container {booking.Schedule.PreAdvice.Container.ContainerNo}.",
            cancellationToken);

        return BuildValidateResponse(booking, valid: true, message: "Valid booking.");
    }

    public async Task<LogicteckBookingLookupResponse?> LookupForLogicteckAsync(string qrCode, CancellationToken cancellationToken = default)
    {
        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.QRCode == qrCode, cancellationToken);

        if (booking is null)
        {
            return new LogicteckBookingLookupResponse(
                false,
                "Booking reference not found.",
                null, null, null, null, null, null, null, null,
                false, false);
        }

        return new LogicteckBookingLookupResponse(
            true,
            null,
            booking.QRCode,
            booking.Schedule.PreAdvice.Container.ContainerNo,
            booking.Schedule.PreAdvice.ShippingLine.Code,
            booking.Schedule.Trucker?.FullName ?? booking.Schedule.Trucker?.Username,
            booking.Schedule.PreAdvice.ReferenceNo,
            booking.Schedule.Date.ToString("yyyy-MM-dd"),
            booking.Schedule.Time.ToString("HH:mm"),
            booking.Schedule.Depot.Name,
            booking.LogicteckBookedAt.HasValue,
            booking.IsUsed,
            BuildTransferLink(booking));
    }

    public async Task<LogicteckBookingDossierResponse?> LookupDossierForLogicteckAsync(
        string qrCode,
        CancellationToken cancellationToken = default)
    {
        var booking = await LoadDossierBookingQuery()
            .FirstOrDefaultAsync(x => x.QRCode == qrCode, cancellationToken);

        if (booking is null)
        {
            return new LogicteckBookingDossierResponse(
                false,
                "Booking reference not found.",
                null, null, null, null, null, null, null, null,
                false, false,
                null, null, null,
                Array.Empty<LogicteckDossierDocumentDto>(),
                null);
        }

        var preAdvice = booking.Schedule.PreAdvice;
        var hasDamage = preAdvice.Documents.Any(d => d.Category == ContainerPhotoCategory.Damage);
        var qrBytes = await DownloadQrAsync(booking.Id, cancellationToken);
        var qrBase64 = qrBytes is null
            ? null
            : $"data:image/png;base64,{Convert.ToBase64String(qrBytes)}";

        var documents = preAdvice.Documents
            .OrderBy(d => d.Category)
            .ThenBy(d => d.CreatedAt)
            .Select(d => new LogicteckDossierDocumentDto(
                d.Category?.ToString(),
                d.Category.HasValue ? ContainerPhotoCatalog.GetLabel(d.Category.Value) : null,
                d.Comment,
                d.FileName,
                d.ContentType,
                d.FileSize,
                BuildPublicAssetUrl(d.FilePath)))
            .ToList();

        return new LogicteckBookingDossierResponse(
            true,
            null,
            booking.QRCode,
            preAdvice.Container.ContainerNo,
            preAdvice.ShippingLine.Code,
            booking.Schedule.Trucker?.FullName ?? booking.Schedule.Trucker?.Username,
            preAdvice.ReferenceNo,
            booking.Schedule.Date.ToString("yyyy-MM-dd"),
            booking.Schedule.Time.ToString("HH:mm"),
            booking.Schedule.Depot.Name,
            booking.LogicteckBookedAt.HasValue,
            booking.IsUsed,
            new LogicteckDossierPreAdviceDto(
                preAdvice.Id,
                preAdvice.ReferenceNo,
                preAdvice.Status.ToString(),
                preAdvice.Trucker.FullName ?? preAdvice.Trucker.Username,
                preAdvice.Trucker.Username,
                preAdvice.TruckerId,
                preAdvice.ShippingLine.Name,
                preAdvice.Container.ContainerNo,
                preAdvice.Container.Size,
                $"{preAdvice.ContainerType.Code} — {preAdvice.ContainerType.Label}",
                preAdvice.Remarks,
                preAdvice.Status == PreAdviceStatus.ForCompliance ? preAdvice.Evaluation?.Remarks : null,
                preAdvice.CreatedAt,
                hasDamage),
            new LogicteckDossierScheduleDto(
                booking.Schedule.Id,
                preAdvice.ReferenceNo,
                booking.Schedule.Depot.Name,
                booking.Schedule.Date.ToString("yyyy-MM-dd"),
                booking.Schedule.Time.ToString("HH:mm"),
                booking.Schedule.SlotNo,
                booking.Schedule.Status.ToString(),
                booking.Schedule.Trucker?.FullName ?? booking.Schedule.Trucker?.Username),
            new LogicteckDossierQrDto(
                booking.Id,
                booking.QRCode,
                booking.GeneratedAt,
                ResolveLogicteckStatus(booking),
                booking.IsUsed,
                booking.LogicteckBookedAt,
                qrBase64),
            documents,
            BuildTransferLink(booking));
    }

    public async Task<BookLogicteckResponse> BookLogicteckAsync(
        int bookingId,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var booking = await LoadBookingQuery()
            .FirstOrDefaultAsync(x => x.Id == bookingId, cancellationToken);

        if (booking is null)
            return new BookLogicteckResponse(false, "Transfer QR not found.", null, null, null);

        if (!CanAccessBooking(booking, userId, role))
            return new BookLogicteckResponse(false, "You are not allowed to send this pre-advice data to LOGICTECK.", null, null, null);

        if (booking.IsUsed)
            return new BookLogicteckResponse(false, "QR already retrieved by LOGICTECK.", MapToDto(booking), null, null);

        if (booking.LogicteckBookedAt.HasValue)
        {
            return new BookLogicteckResponse(
                true,
                "Pre-advice data already sent to LOGICTECK.",
                MapToDto(booking),
                booking.LogicteckExternalRef,
                string.IsNullOrWhiteSpace(_logicteckOptions.PortalUrl) ? null : _logicteckOptions.PortalUrl);
        }

        var transfer = await ExecuteTransferToLogicteckAsync(
            booking,
            userId,
            "LOGICTECK_BOOK",
            cancellationToken);
        if (!transfer.Success)
            return new BookLogicteckResponse(false, transfer.Error ?? "Could not transfer pre-advice data to LOGICTECK.", MapToDto(booking), null, null);

        var portalUrl = string.IsNullOrWhiteSpace(_logicteckOptions.PortalUrl) ? null : _logicteckOptions.PortalUrl;
        return new BookLogicteckResponse(
            true,
            string.IsNullOrWhiteSpace(_logicteckOptions.BookUrl)
                ? "Pre-advice data recorded for LOGICTECK transfer. Return booking is on the LOGICTECK side."
                : "Pre-advice data transferred to LOGICTECK. Return booking is on the LOGICTECK side.",
            MapToDto(booking),
            transfer.ExternalRef,
            portalUrl);
    }

    private async Task<(bool Success, string? ExternalRef, string? Error)> ExecuteTransferToLogicteckAsync(
        Domain.Entities.QRBooking booking,
        int auditUserId,
        string auditAction,
        CancellationToken cancellationToken)
    {
        if (booking.LogicteckBookedAt.HasValue || booking.IsUsed)
            return (true, booking.LogicteckExternalRef, null);

        var outboundPayload = BuildOutboundPayload(booking);
        var (success, externalRef, error) = await _logicteckClient.SubmitBookingAsync(outboundPayload, cancellationToken);
        if (!success)
            return (false, null, error);

        booking.LogicteckBookedAt = PhilippinesTime.UtcNow;
        booking.LogicteckExternalRef = externalRef;
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            auditUserId,
            auditAction,
            "QR",
            $"QR {booking.QRCode} — pre-advice data transferred to LOGICTECK for container {booking.Schedule.PreAdvice.Container.ContainerNo}.",
            cancellationToken);

        return (true, externalRef, null);
    }

    private LogicteckOutboundPayload BuildOutboundPayload(Domain.Entities.QRBooking booking)
    {
        var link = BuildTransferLink(booking);
        var preAdvice = booking.Schedule.PreAdvice;
        return new LogicteckOutboundPayload(
            booking.QRCode,
            preAdvice.Container.ContainerNo,
            preAdvice.ShippingLine.Code,
            booking.Schedule.Trucker?.FullName ?? booking.Schedule.Trucker?.Username ?? preAdvice.Trucker.FullName ?? preAdvice.Trucker.Username,
            preAdvice.Trucker.Username,
            preAdvice.TruckerId,
            preAdvice.ReferenceNo,
            preAdvice.Id,
            booking.ScheduleId,
            booking.Id,
            booking.Schedule.Date.ToString("yyyy-MM-dd"),
            booking.Schedule.Time.ToString("HH:mm"),
            booking.Schedule.Depot.Name,
            link.LookupUrl,
            link.DossierUrl,
            link.ValidateUrl);
    }

    private QrPayloadDto BuildQrPayload(Domain.Entities.Schedule schedule, string qrCode, int qrBookingId)
    {
        var preAdvice = schedule.PreAdvice;
        var truckerName = schedule.Trucker?.FullName ?? schedule.Trucker?.Username ?? "N/A";
        return new QrPayloadDto(
            qrCode,
            preAdvice.Container.ContainerNo,
            preAdvice.ShippingLine.Code,
            schedule.Depot.Name,
            schedule.Date.ToString("yyyy-MM-dd"),
            schedule.Time.ToString("HH:mm"),
            truckerName,
            BuildValidateUrl(),
            BuildLookupUrl(qrCode),
            BuildDossierUrl(qrCode),
            preAdvice.ReferenceNo,
            preAdvice.TruckerId,
            preAdvice.Trucker.Username,
            preAdvice.Id,
            schedule.Id);
    }

    private LogicteckTransferLinkDto BuildTransferLink(Domain.Entities.QRBooking booking)
    {
        var preAdvice = booking.Schedule.PreAdvice;
        var truckerName = booking.Schedule.Trucker?.FullName
            ?? booking.Schedule.Trucker?.Username
            ?? preAdvice.Trucker.FullName
            ?? preAdvice.Trucker.Username;
        return new LogicteckTransferLinkDto(
            booking.QRCode,
            preAdvice.TruckerId,
            preAdvice.Trucker.Username,
            truckerName,
            preAdvice.Id,
            preAdvice.ReferenceNo,
            booking.ScheduleId,
            booking.Id,
            BuildLookupUrl(booking.QRCode),
            BuildDossierUrl(booking.QRCode),
            BuildValidateUrl());
    }

    private string BuildLookupUrl(string qrCode)
    {
        var baseUrl = _logicteckOptions.PublicApiBaseUrl.TrimEnd('/');
        return $"{baseUrl}/api/logicteck/booking/{Uri.EscapeDataString(qrCode)}";
    }

    private string BuildDossierUrl(string qrCode)
    {
        var baseUrl = _logicteckOptions.PublicApiBaseUrl.TrimEnd('/');
        return $"{baseUrl}/api/logicteck/booking/{Uri.EscapeDataString(qrCode)}/dossier";
    }

    private IQueryable<Domain.Entities.QRBooking> LoadBookingQuery()
        => _db.QRBookings
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Trucker)
            .Include(x => x.Schedule).ThenInclude(s => s.Depot)
            .Include(x => x.Schedule).ThenInclude(s => s.Trucker);

    private IQueryable<Domain.Entities.QRBooking> LoadDossierBookingQuery()
        => _db.QRBookings
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Trucker)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ContainerSize)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ContainerType)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Evaluation)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Documents)
            .Include(x => x.Schedule).ThenInclude(s => s.Depot)
            .Include(x => x.Schedule).ThenInclude(s => s.Trucker);

    private string BuildPublicAssetUrl(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return string.Empty;
        if (filePath.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || filePath.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return filePath;
        }

        var baseUrl = _logicteckOptions.PublicApiBaseUrl.TrimEnd('/');
        var path = filePath.StartsWith('/') ? filePath : $"/{filePath}";
        return $"{baseUrl}{path}";
    }

    private string BuildValidateUrl()
    {
        var baseUrl = _logicteckOptions.PublicApiBaseUrl.TrimEnd('/');
        return $"{baseUrl}/api/logicteck/validate-qr";
    }

    private static bool CanAccessBooking(Domain.Entities.QRBooking booking, int userId, string role)
    {
        var normalized = RoleNames.NormalizeTransactionRole(role);
        if (string.Equals(normalized, RoleNames.Administrator, StringComparison.OrdinalIgnoreCase)
            || string.Equals(normalized, RoleNames.DepotPersonnel, StringComparison.OrdinalIgnoreCase)
            || string.Equals(normalized, RoleNames.ShippingLineEvaluator, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return booking.Schedule.PreAdvice.TruckerId == userId;
    }

    private static ValidateQrResponse BuildValidateResponse(Domain.Entities.QRBooking booking, bool valid, string message)
        => new(
            valid,
            message,
            booking.QRCode,
            booking.Schedule.PreAdvice.Container.ContainerNo,
            booking.Schedule.PreAdvice.ShippingLine.Code,
            booking.Schedule.Trucker?.FullName ?? booking.Schedule.Trucker?.Username,
            booking.Schedule.PreAdvice.ReferenceNo,
            booking.Schedule.Date.ToString("yyyy-MM-dd"),
            booking.Schedule.Time.ToString("HH:mm"),
            booking.Schedule.Depot.Name);

    private static QrBookingDto MapToDto(Domain.Entities.QRBooking booking)
    {
        var payload = JsonSerializer.Deserialize<QrPayloadDto>(booking.PayloadJson)
            ?? new QrPayloadDto(booking.QRCode, "", "", "", "", "", "");

        return new QrBookingDto(
            booking.Id,
            booking.ScheduleId,
            booking.QRCode,
            payload,
            booking.GeneratedAt,
            booking.IsUsed,
            booking.LogicteckBookedAt,
            ResolveLogicteckStatus(booking));
    }

    private static string ResolveLogicteckStatus(Domain.Entities.QRBooking booking)
    {
        if (booking.IsUsed) return "Retrieved";
        if (booking.LogicteckBookedAt.HasValue) return "Booked";
        return "Available";
    }
}
