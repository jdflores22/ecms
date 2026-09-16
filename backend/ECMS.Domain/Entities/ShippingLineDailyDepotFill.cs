using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>Daily primary CY for empty-return fill (overrides static list for that date).</summary>
public class ShippingLineDailyDepotFill : BaseEntity
{
    public int ShippingLineId { get; set; }
    public DateOnly EffectiveDate { get; set; }
    public int PrimaryDepotId { get; set; }
    public int SetByUserId { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot PrimaryDepot { get; set; } = null!;
    public User SetByUser { get; set; } = null!;
}
