using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class AuditLog : BaseEntity
{
    public int UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; } = PhilippinesTime.UtcNow;

    public User User { get; set; } = null!;
}
