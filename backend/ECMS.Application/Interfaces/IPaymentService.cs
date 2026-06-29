using ECMS.Application.DTOs.Payment;

namespace ECMS.Application.Interfaces;

public interface IPaymentService
{
    Task<PaymentDto> UploadProofAsync(
        UploadPaymentRequest request,
        int truckerId,
        string proofFilePath,
        string? absoluteProofPath = null,
        CancellationToken cancellationToken = default);
    Task<PaymentStatusDto?> GetStatusAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<PaymentDto?> VerifyAsync(
        int id,
        VerifyPaymentRequest request,
        int actorUserId,
        CancellationToken cancellationToken = default);
    Task<PaymentDto?> UpdateProofMetadataAsync(
        int id,
        UpdatePaymentProofMetadataRequest request,
        int actorUserId,
        CancellationToken cancellationToken = default);
    Task<PaymentDto?> ExtractProofMetadataAsync(
        int id,
        string contentRoot,
        int actorUserId,
        CancellationToken cancellationToken = default);
    Task<PaymentProofFileInfo?> GetProofFileAsync(
        int id,
        string contentRoot,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentDto>> GetByTruckerAsync(int truckerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentDto>> GetPendingVerificationAsync(int? depotId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentDto>> GetForDepotAsync(int? depotId, CancellationToken cancellationToken = default);
    Task<PaymentDto?> GetByScheduleAsync(
        int scheduleId,
        int userId,
        string role,
        int? depotId,
        int? shippingLineId,
        CancellationToken cancellationToken = default);
    Task<int> GetPendingVerificationCountAsync(CancellationToken cancellationToken = default);
    Task<int> GetPaymentDueCountAsync(int truckerId, CancellationToken cancellationToken = default);
}
