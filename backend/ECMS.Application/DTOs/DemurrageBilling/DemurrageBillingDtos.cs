using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.DemurrageBilling;

public record DemurrageBillingFeeLineDto(
    int Id,
    string Description,
    decimal Amount,
    int SortOrder);

public record DemurrageBillingDto(
    int Id,
    string ReferenceNo,
    int PreAdviceId,
    string PreAdviceReferenceNo,
    int ShippingLineId,
    string ShippingLineName,
    int TruckerId,
    string TruckerName,
    string ContainerNo,
    string ContainerSize,
    string ContainerType,
    string DemurrageValidUntil,
    string ExpiredOn,
    int DaysOverdue,
    decimal DemurrageAmount,
    decimal DetentionAmount,
    decimal TotalAmount,
    IReadOnlyList<DemurrageBillingFeeLineDto> FeeLines,
    PaymentStatus Status,
    string? ProofFile,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt,
    DateTime? PaidAt,
    DateTime CreatedAt);

public record DemurrageBillingFeeInput(string Description, decimal Amount);

public record UpdateDemurrageBillingFeesRequest(IReadOnlyList<DemurrageBillingFeeInput> FeeLines);

public record CreateDemurrageBillingRequest(
    int PreAdviceId,
    IReadOnlyList<DemurrageBillingFeeInput>? FeeLines);

public record EligibleDemurragePreAdviceDto(
    int PreAdviceId,
    string ReferenceNo,
    string ContainerNo,
    string TruckerName,
    string DemurrageValidUntil,
    int DaysOverdue);

public record DemurrageBlockCheckDto(
    bool IsBlocked,
    string? Message,
    DemurrageBillingDto? Billing);

public record UploadDemurrageProofRequest(
    int BillingId,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt);

public record VerifyDemurrageBillingRequest(
    bool Approved,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt);
