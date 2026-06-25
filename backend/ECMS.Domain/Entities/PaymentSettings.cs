namespace ECMS.Domain.Entities;

/// <summary>Singleton system row (Id = 1) for return payment fee calibration.</summary>
public class PaymentSettings
{
    public int Id { get; set; } = 1;
    public decimal ReturnFeeAmount { get; set; } = 5000m;
    public DateTime UpdatedAt { get; set; }
}
