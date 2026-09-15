namespace ECMS.Application.DTOs.ShippingLine;

public record ShippingLinePaymentConfigDto(
    int ShippingLineId,
    string ShippingLineName,
    bool PayMongoEnabled,
    bool AllowProofUpload,
    bool HasPayMongoSecretKey,
    bool PayMongoPlatformConfigured,
    DateTime UpdatedAt);

public record UpdateShippingLinePaymentConfigRequest(
    bool PayMongoEnabled,
    bool AllowProofUpload,
    string? PayMongoSecretKey = null,
    bool ClearPayMongoSecretKey = false);

public record DemurragePaymentOptionsDto(
    bool PayMongoEnabled,
    bool AllowProofUpload,
    bool PayMongoConfigured);
