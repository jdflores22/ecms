using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.Payment;

public record PaymentDto(
    int Id,
    int ScheduleId,
    int TruckerId,
    string TruckerName,
    decimal Amount,
    string? ProofFile,
    PaymentStatus Status,
    DateTime? PaidAt);

public record PaymentStatusDto(int Id, PaymentStatus Status, string? ProofFile);

public record UploadPaymentRequest(int ScheduleId, decimal Amount);
