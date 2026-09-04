using ECMS.Application.DTOs.DemurrageBilling;

namespace ECMS.Application.Interfaces;

public interface IDemurrageBillingService
{
    Task SyncExpiredBillingsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DemurrageBillingDto>> GetAllAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<int> GetPaymentDueCountAsync(int userId, string role, CancellationToken cancellationToken = default);

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
        string role,
        CancellationToken cancellationToken = default);

    Task EnsureTruckerCanCreatePreAdviceAsync(
        int truckerId,
        string containerNo,
        int shippingLineId,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates (or returns) demurrage/detention billing when a pre-forecast's free time has expired.
    /// Used on draft create with expired CRO/eDO and when a trucker attempts submit.
    /// </summary>
    Task<DemurrageBillingDto> EnsureBillingForExpiredFreeTimeAsync(
        int preAdviceId,
        int actorUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Trucker-owned ensure: creates billing for an expired free-time draft so charges appear before submit.
    /// </summary>
    Task<DemurrageBillingDto> EnsureBillingForTruckerExpiredFreeTimeAsync(
        int preAdviceId,
        int truckerId,
        CancellationToken cancellationToken = default);
}
