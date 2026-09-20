namespace ECMS.Application.DTOs.Payment;

/// <summary>Captured PayMongo checkout payment metadata for admin reference display.</summary>
public record PayMongoSettlementDetails(
    string? ReferenceNo,
    string? PaymentId,
    string? QrphInvoiceNo,
    DateTime? PaidAtUtc,
    string? Provider);
