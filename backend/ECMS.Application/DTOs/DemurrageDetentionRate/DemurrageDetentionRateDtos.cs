namespace ECMS.Application.DTOs.DemurrageDetentionRate;

public record DemurrageDetentionRateDto(
    int Id,
    int ShippingLineId,
    string ShippingLineName,
    int? DepotId,
    string? DepotName,
    int? ContainerSizeId,
    string? ContainerSizeLabel,
    decimal DemurrageAmount,
    decimal DetentionAmount,
    string EffectiveFrom,
    string? EffectiveTo,
    bool IsActive,
    DateTime UpdatedAt,
    DateTime CreatedAt);

public record UpsertDemurrageDetentionRateRequest(
    int ShippingLineId,
    int? DepotId,
    int? ContainerSizeId,
    decimal DemurrageAmount,
    decimal DetentionAmount,
    DateOnly EffectiveFrom,
    DateOnly? EffectiveTo,
    bool IsActive = true);

public record ResolvedDemurrageDetentionRateDto(
    decimal DemurrageAmount,
    decimal DetentionAmount,
    bool UsedFallback,
    int? RateId,
    string Label);
