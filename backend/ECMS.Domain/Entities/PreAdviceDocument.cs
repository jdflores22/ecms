using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class PreAdviceDocument : BaseEntity
{
    public int PreAdviceId { get; set; }
    public ContainerPhotoCategory? Category { get; set; }
    public string? Comment { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int UploadedById { get; set; }

    public PreAdvice PreAdvice { get; set; } = null!;
    public User UploadedBy { get; set; } = null!;
}
