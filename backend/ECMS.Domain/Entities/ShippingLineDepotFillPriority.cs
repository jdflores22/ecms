using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>Static CY fill priority for a shipping line (lower SortOrder = fill first).</summary>
public class ShippingLineDepotFillPriority : BaseEntity
{
    public int ShippingLineId { get; set; }
    public int DepotId { get; set; }
    public int SortOrder { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot Depot { get; set; } = null!;
}
