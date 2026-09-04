using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>
/// Configurable demurrage and detention amounts per shipping line,
/// with optional depot / container-size scope and an effective date range.
/// </summary>
public class DemurrageDetentionRate : BaseEntity
{
    public int ShippingLineId { get; set; }
    public int? DepotId { get; set; }
    public int? ContainerSizeId { get; set; }
    public decimal DemurrageAmount { get; set; }
    public decimal DetentionAmount { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = PhilippinesTime.UtcNow;

    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot? Depot { get; set; }
    public ContainerSize? ContainerSize { get; set; }
}
