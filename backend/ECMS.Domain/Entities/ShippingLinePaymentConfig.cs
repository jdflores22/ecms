namespace ECMS.Domain.Entities;

/// <summary>Per shipping line demurrage payment options (1:1 with ShippingLine).</summary>
public class ShippingLinePaymentConfig
{
    public int ShippingLineId { get; set; }
    public bool PayMongoEnabled { get; set; }
    /// <summary>Allow cash/office payment with proof upload instead of PayMongo.</summary>
    public bool AllowProofUpload { get; set; } = true;
    /// <summary>Optional per-line PayMongo secret key. Falls back to platform key when empty.</summary>
    public string? PayMongoSecretKey { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
}
