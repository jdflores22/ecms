using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>
/// Credit facility extended by a shipping line to truckers (utilized when SOA credit is applied).
/// </summary>
public class ShippingLineCreditLine : BaseEntity
{
    public int ShippingLineId { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal UtilizedAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
}
