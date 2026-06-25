using System.Text.Json;
using ECMS.Application.DTOs.QR;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using Microsoft.EntityFrameworkCore;
using QRCoder;

namespace ECMS.Infrastructure.Services;

public class QrCodeService : IQrService
{
    private readonly IEcmsDbContext _db;

    public QrCodeService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<QrBookingDto?> GetByBookingIdAsync(int bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await _db.QRBookings
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(x => x.Schedule).ThenInclude(s => s.Depot)
            .Include(x => x.Schedule).ThenInclude(s => s.Trucker)
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
            .Include(x => x.Depot)
            .Include(x => x.Trucker)
            .Include(x => x.QRBooking)
            .FirstOrDefaultAsync(x => x.Id == scheduleId, cancellationToken)
            ?? throw new InvalidOperationException("Schedule not found.");

        if (schedule.QRBooking is not null)
            return MapToDto(schedule.QRBooking);

        var bookingId = $"ICS-{PhilippinesTime.Year}{schedule.Id:D5}";
        var payload = new QrPayloadDto(
            bookingId,
            schedule.PreAdvice.Container.ContainerNo,
            schedule.PreAdvice.ShippingLine.Code,
            schedule.Depot.Name,
            schedule.Date.ToString("yyyy-MM-dd"),
            schedule.Time.ToString("HH:mm"),
            schedule.Trucker?.FullName ?? schedule.Trucker?.Username ?? "N/A");

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
        return MapToDto(booking);
    }

    public async Task<QrBookingDto?> GetByScheduleIdAsync(int scheduleId, CancellationToken cancellationToken = default)
    {
        var booking = await _db.QRBookings
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(x => x.Schedule).ThenInclude(s => s.Depot)
            .Include(x => x.Schedule).ThenInclude(s => s.Trucker)
            .FirstOrDefaultAsync(x => x.ScheduleId == scheduleId, cancellationToken);

        return booking is null ? null : MapToDto(booking);
    }

    public async Task<ValidateQrResponse> ValidateAsync(ValidateQrRequest request, CancellationToken cancellationToken = default)
    {
        var booking = await _db.QRBookings
            .Include(x => x.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(p => p.Container)
            .Include(x => x.Schedule).ThenInclude(s => s.Depot)
            .FirstOrDefaultAsync(x => x.QRCode == request.QrCode, cancellationToken);

        if (booking is null || booking.IsUsed)
            return new ValidateQrResponse(false, null, null, null, null);

        return new ValidateQrResponse(
            true,
            booking.Schedule.PreAdvice.Container.ContainerNo,
            booking.Schedule.Date.ToString("yyyy-MM-dd"),
            booking.Schedule.Time.ToString("HH:mm"),
            booking.Schedule.Depot.Name);
    }

    private static QrBookingDto MapToDto(Domain.Entities.QRBooking booking)
    {
        var payload = JsonSerializer.Deserialize<QrPayloadDto>(booking.PayloadJson)
            ?? new QrPayloadDto(booking.QRCode, "", "", "", "", "", "");

        return new QrBookingDto(booking.Id, booking.ScheduleId, booking.QRCode, payload, booking.GeneratedAt, booking.IsUsed);
    }
}
