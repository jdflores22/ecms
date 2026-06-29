using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

/// <summary>
/// Demurrage and detention charge when an approved pre-forecast expires without CY return.
/// </summary>
public class DemurrageBilling : BaseEntity
{
    public string ReferenceNo { get; set; } = string.Empty;
    public int PreAdviceId { get; set; }
    public int ShippingLineId { get; set; }
    public int TruckerId { get; set; }
    public string ContainerNoNormalized { get; set; } = string.Empty;
    public int ContainerSizeId { get; set; }
    public int ContainerTypeId { get; set; }
    public DateOnly DemurrageValidUntil { get; set; }
    public DateOnly ExpiredOn { get; set; }
    public decimal DemurrageAmount { get; set; }
    public decimal DetentionAmount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? ProofFile { get; set; }
    public string? ProofReferenceNo { get; set; }
    public DateTime? ProofTransactionAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public PreAdvice PreAdvice { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public User Trucker { get; set; } = null!;
    public ContainerSize ContainerSize { get; set; } = null!;
    public ContainerType ContainerType { get; set; } = null!;
    public ICollection<DemurrageBillingFeeLine> FeeLines { get; set; } = new List<DemurrageBillingFeeLine>();
}
