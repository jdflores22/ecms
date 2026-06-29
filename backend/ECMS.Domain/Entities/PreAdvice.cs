using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class PreAdvice : BaseEntity
{
    public string ReferenceNo { get; set; } = string.Empty;
    public int TruckerId { get; set; }
    public int ShippingLineId { get; set; }
    public int ContainerId { get; set; }
    public string ContainerNoNormalized { get; set; } = string.Empty;
    public int ContainerSizeId { get; set; }
    public int ContainerTypeId { get; set; }
    /// <summary>
    /// Unique key for active (non-terminal) requests: shippingLine|containerNo|sizeId|typeId.
    /// Cleared when status is Rejected or Cancelled so a new request can be filed.
    /// </summary>
    public string? ActiveRequestKey { get; set; }
    public PreAdviceStatus Status { get; set; } = PreAdviceStatus.Draft;
    /// <summary>Last day the empty may be returned without demurrage/detention charges.</summary>
    public DateOnly? DemurrageValidUntil { get; set; }
    public string? Remarks { get; set; }

    public User Trucker { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public Container Container { get; set; } = null!;
    public ContainerSize ContainerSize { get; set; } = null!;
    public ContainerType ContainerType { get; set; } = null!;
    public Evaluation? Evaluation { get; set; }
    public Schedule? Schedule { get; set; }
    public ICollection<PreAdviceDocument> Documents { get; set; } = new List<PreAdviceDocument>();
}
