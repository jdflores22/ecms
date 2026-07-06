using ECMS.Application.DTOs.Certificate;
using ECMS.Domain.Enums;

namespace ECMS.Application.Interfaces;

public interface ICertificateTemplateService
{
    Task<IReadOnlyList<CertificateTemplateDto>> GetAllAsync(
        int? shippingLineId,
        CertificateDocumentType? documentType,
        CancellationToken cancellationToken = default);

    Task<CertificateTemplateDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<CertificateTemplateDto> CreateAsync(
        CreateCertificateTemplateRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<CertificateTemplateDto?> UpdateAsync(
        int id,
        UpdateCertificateTemplateRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<bool> ActivateAsync(int id, int userId, CancellationToken cancellationToken = default);

    Task<string?> GetActiveLayoutJsonAsync(
        int shippingLineId,
        CertificateDocumentType documentType,
        CancellationToken cancellationToken = default);

    IReadOnlyList<CertificateMergeFieldDto> GetMergeFields(CertificateDocumentType documentType);
}
