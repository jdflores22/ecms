using ECMS.Application.DTOs.DemurrageBilling;

namespace ECMS.Application.Interfaces;

public interface IDemurrageBillingService
{
    Task SyncExpiredBillingsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DemurrageBillingDto>> GetAllAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DemurrageBillingDto?> GetByIdAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EligibleDemurragePreAdviceDto>> GetEligiblePreAdvicesAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DemurrageBillingDto> CreateAsync(
        CreateDemurrageBillingRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DemurrageBillingDto?> UpdateFeesAsync(
        int id,
        UpdateDemurrageBillingFeesRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DemurrageBlockCheckDto> CheckBlockAsync(
        int truckerId,
        string containerNo,
        int shippingLineId,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default);

    Task<DemurrageBillingDto> UploadProofAsync(
        int billingId,
        int truckerId,
        string proofFilePath,
        string? absoluteProofPath,
        string? proofReferenceNo,
        DateTime? proofTransactionAt,
        CancellationToken cancellationToken = default);

    Task<DemurrageBillingDto?> VerifyAsync(
        int id,
        VerifyDemurrageBillingRequest request,
        int actorUserId,
        CancellationToken cancellationToken = default);

    Task EnsureTruckerCanCreatePreAdviceAsync(
        int truckerId,
        string containerNo,
        int shippingLineId,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default);
}
