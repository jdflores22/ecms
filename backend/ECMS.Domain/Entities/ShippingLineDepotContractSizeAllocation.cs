using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ShippingLineDepotContractSizeAllocation : BaseEntity
{
    public int ContractId { get; set; }
    public int ContainerSizeId { get; set; }
    public int ContractCount { get; set; }

    public ShippingLineDepotContract Contract { get; set; } = null!;
    public ContainerSize ContainerSize { get; set; } = null!;
}
