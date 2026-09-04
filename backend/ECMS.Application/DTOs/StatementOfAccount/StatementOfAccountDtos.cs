using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.StatementOfAccount;

public record ShippingLineCreditLineDto(
    int Id,
    int ShippingLineId,
    string ShippingLineName,
    decimal CreditLimit,
    decimal UtilizedAmount,
    decimal AvailableCredit,
    bool IsActive,
    DateTime UpdatedAt);

public record UpdateShippingLineCreditLineRequest(decimal CreditLimit, bool IsActive);

public record StatementOfAccountLineDto(
    int Id,
    int DemurrageBillingId,
    string DemurrageBillingReferenceNo,
    string ContainerNo,
    string PreAdviceReferenceNo,
    string Description,
    decimal Amount,
    int SortOrder,
    PaymentStatus BillingStatus);

public record StatementOfAccountDto(
    int Id,
    string ReferenceNo,
    int ShippingLineId,
    string ShippingLineName,
    int TruckerId,
    string TruckerName,
    string? PeriodFrom,
    string? PeriodTo,
    StatementOfAccountStatus Status,
    decimal TotalAmount,
    decimal CreditApplied,
    decimal AmountDue,
    string? DueDate,
    DateTime? IssuedAt,
    DateTime? PaidAt,
    string? IssuedByName,
    string? Remarks,
    string? ProofFile,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt,
    DateTime CreatedAt,
    IReadOnlyList<StatementOfAccountLineDto> Lines);

public record EligibleSoaBillingDto(
    int DemurrageBillingId,
    string ReferenceNo,
    string ContainerNo,
    string PreAdviceReferenceNo,
    string TruckerName,
    int TruckerId,
    decimal TotalAmount,
    string ExpiredOn,
    PaymentStatus Status);

/// <summary>Truckers enrolled for SOA with optional outstanding billing summary.</summary>
public record SoaTruckerRegisterDto(
    int TruckerId,
    string TruckerName,
    int BillingCount,
    decimal TotalAmount,
    string? OldestExpiredOn,
    string? LatestExpiredOn,
    IReadOnlyList<int> DemurrageBillingIds,
    DateTime RegisteredAt);

/// <summary>Active truckers that may be enrolled for SOA by the shipping line.</summary>
public record SoaTruckerCandidateDto(
    int TruckerId,
    string TruckerName,
    int PendingBillingCount,
    decimal PendingTotalAmount);

public record RegisterSoaTruckerRequest(int TruckerId);

public record CreateStatementOfAccountRequest(
    int TruckerId,
    IReadOnlyList<int> DemurrageBillingIds,
    decimal CreditApplied,
    string? Remarks,
    bool IssueImmediately,
    string? DueDate);

public record IssueStatementOfAccountRequest(string? DueDate, string? Remarks);

public record VerifyStatementOfAccountRequest(
    bool Approved,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt);

public record UploadStatementOfAccountProofRequest(
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt);
