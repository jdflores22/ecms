using ECMS.Application.DTOs.QR;

namespace ECMS.Application.Interfaces;

public interface IQrService
{
    Task<QrBookingDto?> GetByBookingIdAsync(int bookingId, CancellationToken cancellationToken = default);
    Task<byte[]?> DownloadQrAsync(int bookingId, CancellationToken cancellationToken = default);
    Task<QrBookingDto> GenerateForScheduleAsync(int scheduleId, CancellationToken cancellationToken = default);
    Task<QrBookingDto?> GetByScheduleIdAsync(int scheduleId, CancellationToken cancellationToken = default);
    Task<ValidateQrResponse> ValidateAsync(ValidateQrRequest request, CancellationToken cancellationToken = default);
}
