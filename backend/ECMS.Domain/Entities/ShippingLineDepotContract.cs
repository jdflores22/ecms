using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ShippingLineDepotContract : BaseEntity
{
    public int ShippingLineId { get; set; }
    public int DepotId { get; set; }
    public int ContractTeu { get; set; }
    public bool IsActive { get; set; } = true;

    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot Depot { get; set; } = null!;
}
