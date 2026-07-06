using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

/// <summary>
/// Opaque verification record for system-generated certificate PDFs.
/// Only a SHA-256 hash of the scan token is stored — never the raw token.
/// </summary>
public class CertificateVerification : BaseEntity
{
    public string TokenHash { get; set; } = string.Empty;
    public int WithdrawalRequestId { get; set; }
    public int WithdrawalDocumentId { get; set; }
    public CertificateDocumentType DocumentType { get; set; }
    public string DocumentFingerprint { get; set; } = string.Empty;
    public string AtwNumber { get; set; } = string.Empty;
    public string ReferenceNo { get; set; } = string.Empty;
    public string ShippingLineName { get; set; } = string.Empty;
    public string TruckerName { get; set; } = string.Empty;
    public string DepotName { get; set; } = string.Empty;
    public string ContainerNo { get; set; } = string.Empty;
    public string ContainerSize { get; set; } = string.Empty;
    public string ContainerType { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public int? WithdrawalRequestLineId { get; set; }
    public DateTime IssuedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevocationReason { get; set; }
    public int VerificationCount { get; set; }
    public DateTime? LastVerifiedAtUtc { get; set; }

    public WithdrawalRequest WithdrawalRequest { get; set; } = null!;
    public WithdrawalDocument WithdrawalDocument { get; set; } = null!;
}
