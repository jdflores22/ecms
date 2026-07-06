using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.Payment;

public record PaymentDto(
    int Id,
    int ScheduleId,
    int TruckerId,
    string TruckerName,
    decimal Amount,
    string? ProofFile,
    string? ProofReferenceNo,
    string? ProofPaymentId,
    string? ProofQrphInvoiceNo,
    DateTime? ProofTransactionAt,
    string? ProofProvider,
    PaymentStatus Status,
    DateTime? PaidAt);

public record UpdatePaymentProofMetadataRequest(
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt,
    string? ProofProvider = null,
    string? ProofQrphInvoiceNo = null,
    string? ProofPaymentId = null);

public record VerifyPaymentRequest(
    bool Approved,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt,
    string? ProofProvider = null,
    string? ProofQrphInvoiceNo = null,
    string? ProofPaymentId = null);

public record PaymentStatusDto(int Id, PaymentStatus Status, string? ProofFile);

public record PaymentSettingsDto(
    decimal ReturnFeeAmount,
    decimal DemurrageFeeAmount,
    decimal DetentionFeeAmount,
    DateTime UpdatedAt);

public record UpdatePaymentSettingsRequest(decimal ReturnFeeAmount);

public record UpdateDemurrageFeeSettingsRequest(
    decimal DemurrageFeeAmount,
    decimal DetentionFeeAmount);

public record UploadPaymentRequest(
    int ScheduleId,
    string? ProofReferenceNo = null,
    DateTime? ProofTransactionAt = null,
    string? ProofProvider = null,
    string? ProofQrphInvoiceNo = null,
    string? ProofPaymentId = null);

public record PaymentProofFileInfo(string AbsolutePath, string ContentType, string FileName);
