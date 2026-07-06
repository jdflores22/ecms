namespace ECMS.Application.Interfaces;

public interface IPaymentProofExtractionService
{
    Task<(string? ReferenceNo, string? PaymentId, string? QrphInvoiceNo, DateTime? TransactionAt, string? Provider)> ExtractFromImageAsync(
        string absoluteFilePath,
        CancellationToken cancellationToken = default);
}
