namespace ECMS.Domain.Enums;

public enum PaymentChannel
{
    ProofUpload = 0,
    PayMongo = 1,
    CashOffice = 2,
    /// <summary>Pre-forecast pilot promo — ₱0, no PayMongo or proof upload.</summary>
    PilotPromotion = 3,
}
