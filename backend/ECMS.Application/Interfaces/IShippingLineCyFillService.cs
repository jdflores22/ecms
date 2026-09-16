using ECMS.Application.DTOs.ShippingLineCyFill;

namespace ECMS.Application.Interfaces;

public interface IShippingLineCyFillService
{
    Task<ShippingLineCyFillSettingsDto> GetSettingsAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ShippingLineCyFillSettingsDto> UpdateStrategyAsync(
        UpdateCyFillStrategyRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ShippingLineCyFillSettingsDto> UpdatePrioritiesAsync(
        UpdateCyFillPrioritiesRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ShippingLineCyFillSettingsDto> SetDailyAssignmentAsync(
        SetDailyDepotFillRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<RecommendedDepotOrderDto> GetRecommendedDepotOrderAsync(
        int shippingLineId,
        DateOnly effectiveDate,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
