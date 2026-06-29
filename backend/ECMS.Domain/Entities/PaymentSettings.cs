namespace ECMS.Domain.Entities;

/// <summary>Singleton system row (Id = 1) for return payment fee calibration.</summary>
public class PaymentSettings
{
    public int Id { get; set; } = 1;
    public decimal ReturnFeeAmount { get; set; } = 5000m;
    public decimal DemurrageFeeAmount { get; set; } = 3500m;
    public decimal DetentionFeeAmount { get; set; } = 2500m;
    public DateTime UpdatedAt { get; set; }
}
