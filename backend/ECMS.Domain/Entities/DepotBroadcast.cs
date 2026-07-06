using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>
/// Depot-originated broadcast message sent to associated trucker users.
/// </summary>
public class DepotBroadcast : BaseEntity
{
    public int DepotId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public int RecipientCount { get; set; }

    public Depot Depot { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
