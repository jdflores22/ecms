using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class ManualYardInventoryEntry : BaseEntity
{
    public string ContainerNo { get; set; } = string.Empty;
    public int ContainerSizeId { get; set; }
    public int ContainerTypeId { get; set; }
    public int DepotId { get; set; }
    public int ShippingLineId { get; set; }
    public DateOnly YardInDate { get; set; }
    public string? Remarks { get; set; }
    public int CreatedByUserId { get; set; }
    public YardInventoryStatus YardStatus { get; set; } = YardInventoryStatus.AtYard;
    public DateTime? ReleasedAt { get; set; }
    public int? ReleasedWithdrawalRequestId { get; set; }
    public int? ReleasedWithdrawalLineId { get; set; }

    public ContainerSize ContainerSize { get; set; } = null!;
    public ContainerType ContainerType { get; set; } = null!;
    public Depot Depot { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
