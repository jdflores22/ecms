using ECMS.Application.Certificates;
using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.Certificate;

public record CertificateTemplateDto(
    int Id,
    int ShippingLineId,
    string ShippingLineName,
    CertificateDocumentType DocumentType,
    string Name,
    string LayoutJson,
    bool IsActive,
    DateTime UpdatedAt,
    DateTime CreatedAt);

public record CreateCertificateTemplateRequest(
    int ShippingLineId,
    CertificateDocumentType DocumentType,
    string Name,
    string? LayoutJson);

public record UpdateCertificateTemplateRequest(
    string Name,
    string LayoutJson);

public record CertificateMergeFieldDto(string Key, string Label, string Kind);

public record CertificateTemplateImageUploadDto(string Path, string FileName);
