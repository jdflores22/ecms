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
    /// <summary>Last day the empty may be returned without demurrage/detention charges (primary unit).</summary>
    public DateOnly? DemurrageValidUntil { get; set; }

    /// <summary>Companion unit free time when <see cref="IsBackToBack"/> is true.</summary>
    public DateOnly? BackToBackCompanionDemurrageValidUntil { get; set; }
    public string? Remarks { get; set; }

    /// <summary>
    /// Two 20ft units on one 40ft chassis, both destined for the same container yard (not port diversion).
    /// </summary>
    public bool IsBackToBack { get; set; }

    /// <summary>Normalized ISO 6346 number of the paired unit when <see cref="IsBackToBack"/> is true.</summary>
    public string? BackToBackCompanionContainerNo { get; set; }

    public int? BackToBackCompanionContainerSizeId { get; set; }

    public int? BackToBackCompanionContainerTypeId { get; set; }

    public ContainerSize? BackToBackCompanionContainerSize { get; set; }

    public ContainerType? BackToBackCompanionContainerType { get; set; }

    /// <summary>CRO/eDO reference captured when the trucker linked a verified document on create.</summary>
    public string? CroEdoReferenceNo { get; set; }
    public string? CroEdoVerificationTokenHash { get; set; }
    public int? ContainerReleaseOrderId { get; set; }

    public User Trucker { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public Container Container { get; set; } = null!;
    public ContainerSize ContainerSize { get; set; } = null!;
    public ContainerType ContainerType { get; set; } = null!;
    public ContainerReleaseOrder? ContainerReleaseOrder { get; set; }
    public Evaluation? Evaluation { get; set; }
    public Schedule? Schedule { get; set; }
    public ICollection<PreAdviceDocument> Documents { get; set; } = new List<PreAdviceDocument>();
}
