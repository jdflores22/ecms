using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>
/// Admin-published news item shown in the trucker app home carousel.
/// </summary>
public class TruckerNews : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? ImagePath { get; set; }
    public string? ImageFileName { get; set; }
    public string? ImageContentType { get; set; }
    public long? ImageFileSize { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int CreatedByUserId { get; set; }

    public User CreatedBy { get; set; } = null!;
}
