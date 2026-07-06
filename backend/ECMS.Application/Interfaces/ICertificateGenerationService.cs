using ECMS.Application.Certificates;
using ECMS.Domain.Enums;

namespace ECMS.Application.Interfaces;

public interface ICertificateGenerationService
{
    byte[] RenderPreview(
        CertificateDocumentType documentType,
        string layoutJson,
        AtwCertificateMergeData? sampleData = null);

    Task AttachAtwCertificateAsync(
        int withdrawalRequestId,
        int generatedByUserId,
        CancellationToken cancellationToken = default);

    Task AttachCyContainerReleaseCertificateAsync(
        int withdrawalRequestId,
        int lineId,
        int generatedByUserId,
        CancellationToken cancellationToken = default);

    Task AttachAtwReleaseCertificateAsync(
        int withdrawalRequestId,
        int generatedByUserId,
        CancellationToken cancellationToken = default);
}
