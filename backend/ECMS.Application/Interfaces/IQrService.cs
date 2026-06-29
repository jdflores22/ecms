using ECMS.Application.DTOs.QR;

namespace ECMS.Application.Interfaces;

public interface IQrService
{
    Task<QrBookingDto?> GetByBookingIdAsync(int bookingId, int userId, string role, CancellationToken cancellationToken = default);
    Task<byte[]?> DownloadQrAsync(int bookingId, int userId, string role, CancellationToken cancellationToken = default);
    Task<QrBookingDto> GenerateForScheduleAsync(int scheduleId, int userId, string role, CancellationToken cancellationToken = default);
    Task<QrBookingDto?> GetByScheduleIdAsync(int scheduleId, int userId, string role, CancellationToken cancellationToken = default);
    Task<QrBookingDto?> GetByQrCodeAsync(string qrCode, int userId, string role, CancellationToken cancellationToken = default);
    Task<ValidateQrResponse> ValidateAsync(ValidateQrRequest request, CancellationToken cancellationToken = default);
    Task<LogicteckBookingLookupResponse?> LookupForLogicteckAsync(string qrCode, CancellationToken cancellationToken = default);
    Task<LogicteckBookingDossierResponse?> LookupDossierForLogicteckAsync(string qrCode, CancellationToken cancellationToken = default);
    Task<BookLogicteckResponse> BookLogicteckAsync(int bookingId, int userId, string role, CancellationToken cancellationToken = default);
}
