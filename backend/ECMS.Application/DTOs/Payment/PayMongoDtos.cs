namespace ECMS.Application.DTOs.Payment;

public record PayMongoCheckoutDto(string CheckoutUrl, string CheckoutSessionId);

public record UpdatePayMongoSettingsRequest(bool PayMongoEnabled, bool AllowProofUpload);
