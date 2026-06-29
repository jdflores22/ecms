using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class WithdrawalDocument : BaseEntity
{
    public int WithdrawalRequestId { get; set; }
    public WithdrawalDocumentType DocumentType { get; set; } = WithdrawalDocumentType.AtwCertificate;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int UploadedById { get; set; }

    public WithdrawalRequest WithdrawalRequest { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}
