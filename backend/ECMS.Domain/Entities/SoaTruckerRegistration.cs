using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

/// <summary>
/// Truckers explicitly enrolled by a shipping line for SOA billing.
/// Only registered truckers may be included in statement-of-account workflows.
/// </summary>
public class SoaTruckerRegistration : BaseEntity
{
    public int ShippingLineId { get; set; }
    public int TruckerId { get; set; }
    public int RegisteredByUserId { get; set; }
    public DateTime RegisteredAt { get; set; } = PhilippinesTime.UtcNow;

    public ShippingLine ShippingLine { get; set; } = null!;
    public User Trucker { get; set; } = null!;
    public User RegisteredByUser { get; set; } = null!;
}
