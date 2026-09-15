using ECMS.Application.DTOs.ShippingLine;

namespace ECMS.Application.Interfaces;

public interface IShippingLinePaymentConfigService
{
    Task<ShippingLinePaymentConfigDto?> GetAsync(
        int shippingLineId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<ShippingLinePaymentConfigDto?> UpdateAsync(
        int shippingLineId,
        UpdateShippingLinePaymentConfigRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<DemurragePaymentOptionsDto> GetDemurrageOptionsAsync(
        int shippingLineId,
        CancellationToken cancellationToken = default);
}
