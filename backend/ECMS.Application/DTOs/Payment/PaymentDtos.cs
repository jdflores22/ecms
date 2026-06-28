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
    DateTime? ProofTransactionAt,
    PaymentStatus Status,
    DateTime? PaidAt);

public record UpdatePaymentProofMetadataRequest(
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt);

public record VerifyPaymentRequest(
    bool Approved,
    string? ProofReferenceNo,
    DateTime? ProofTransactionAt);

public record PaymentStatusDto(int Id, PaymentStatus Status, string? ProofFile);

public record PaymentSettingsDto(decimal ReturnFeeAmount, DateTime UpdatedAt);

public record UpdatePaymentSettingsRequest(decimal ReturnFeeAmount);

public record UploadPaymentRequest(
    int ScheduleId,
    string? ProofReferenceNo = null,
    DateTime? ProofTransactionAt = null);

public record PaymentProofFileInfo(string AbsolutePath, string ContentType, string FileName);
