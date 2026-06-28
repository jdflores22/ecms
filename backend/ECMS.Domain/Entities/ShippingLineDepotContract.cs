using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ShippingLineDepotContract : BaseEntity
{
    public int ShippingLineId { get; set; }
    public int DepotId { get; set; }
    /// <summary>Legacy TEU total; kept in sync as sum(size count × TEU) for reporting.</summary>
    public int ContractTeu { get; set; }
    public bool IsActive { get; set; } = true;

    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot Depot { get; set; } = null!;
    public ICollection<ShippingLineDepotContractSizeAllocation> SizeAllocations { get; set; } =
        new List<ShippingLineDepotContractSizeAllocation>();
}
