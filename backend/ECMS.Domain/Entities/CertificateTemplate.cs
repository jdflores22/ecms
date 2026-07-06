using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class CertificateTemplate : BaseEntity
{
    public int ShippingLineId { get; set; }
    public CertificateDocumentType DocumentType { get; set; } = CertificateDocumentType.Atw;
    public string Name { get; set; } = string.Empty;
    public string LayoutJson { get; set; } = "{}";
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; } = PhilippinesTime.UtcNow;

    public ShippingLine ShippingLine { get; set; } = null!;
}
