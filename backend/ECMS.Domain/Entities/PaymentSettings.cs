namespace ECMS.Domain.Entities;

/// <summary>Singleton system row (Id = 1) for return payment fee calibration.</summary>
public class PaymentSettings
{
    public int Id { get; set; } = 1;
    public decimal ReturnFeeAmount { get; set; } = 5000m;
    public decimal DemurrageFeeAmount { get; set; } = 3500m;
    public decimal DetentionFeeAmount { get; set; } = 2500m;
    public bool PayMongoEnabled { get; set; }
    /// <summary>Allow manual proof upload (e-wallet screenshot, bank transfer, etc.).</summary>
    public bool AllowProofUpload { get; set; } = true;
    /// <summary>When true and before <see cref="PilotTestingEndsAtUtc"/>, pre-forecast fee is ₱0 and PayMongo/proof are off.</summary>
    public bool PilotTestingEnabled { get; set; }
    public DateTime? PilotTestingEndsAtUtc { get; set; }
    public int PilotTestingDurationDays { get; set; }
    public bool PilotNotified3DaysBefore { get; set; }
    public bool PilotNotified1DayBefore { get; set; }
    public DateTime UpdatedAt { get; set; }
}
