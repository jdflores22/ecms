using ECMS.Application.DTOs.Payment;

namespace ECMS.Application.Interfaces;

public interface IPayMongoService
{
    bool IsPlatformConfigured();
    Task<PayMongoCheckoutDto> CreateReturnCheckoutAsync(
        int scheduleId,
        int truckerId,
        CancellationToken cancellationToken = default);
    Task<PayMongoCheckoutDto> CreateDemurrageCheckoutAsync(
        int billingId,
        int truckerId,
        CancellationToken cancellationToken = default);
    Task<bool> HandleWebhookAsync(
        string rawBody,
        string signatureHeader,
        CancellationToken cancellationToken = default);
    Task<int> RefreshReturnPaymentMetadataAsync(CancellationToken cancellationToken = default);
    Task<bool> SyncReturnPaymentAsync(
        int scheduleId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
