using ECMS.Application.DTOs.Certificate;
using ECMS.Domain.Enums;

namespace ECMS.Application.Interfaces;

public interface ICertificateVerificationService
{
    string GeneratePlainToken();
    string BuildVerifyUrl(string plainToken);
    string ComputeDocumentFingerprint(byte[] pdfBytes);

    Task RegisterAsync(
        string plainToken,
        int withdrawalRequestId,
        int withdrawalDocumentId,
        CertificateDocumentType documentType,
        string documentFingerprint,
        CertificateVerificationRegistration details,
        CancellationToken cancellationToken = default);

    Task RevokeByDocumentIdsAsync(
        IEnumerable<int> withdrawalDocumentIds,
        string reason,
        CancellationToken cancellationToken = default);

    Task<CertificateVerificationResponseDto> VerifyPublicAsync(
        string plainToken,
        CancellationToken cancellationToken = default);
}
