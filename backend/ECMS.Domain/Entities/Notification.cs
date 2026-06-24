using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class Notification : BaseEntity
{
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? LinkPath { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public int? ActorUserId { get; set; }
    public string? ReferenceNo { get; set; }

    public User User { get; set; } = null!;
    public User? Actor { get; set; }
}
