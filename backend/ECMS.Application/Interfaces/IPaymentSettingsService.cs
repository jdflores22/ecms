using ECMS.Application.DTOs.Payment;

namespace ECMS.Application.Interfaces;

public interface IPaymentSettingsService
{
    Task<PaymentSettingsDto> GetAsync(CancellationToken cancellationToken = default);
    Task<PaymentSettingsDto> UpdateReturnFeeAsync(decimal returnFeeAmount, int adminUserId, CancellationToken cancellationToken = default);
    Task<decimal> GetReturnFeeAmountAsync(CancellationToken cancellationToken = default);
    Task<decimal> GetDemurrageFeeAmountAsync(CancellationToken cancellationToken = default);
    Task<decimal> GetDetentionFeeAmountAsync(CancellationToken cancellationToken = default);
    Task<PaymentSettingsDto> UpdateDemurrageFeesAsync(
        decimal demurrageFeeAmount,
        decimal detentionFeeAmount,
        int adminUserId,
        CancellationToken cancellationToken = default);
}
