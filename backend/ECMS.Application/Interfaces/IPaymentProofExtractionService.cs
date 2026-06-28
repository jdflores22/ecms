namespace ECMS.Application.Interfaces;

public interface IPaymentProofExtractionService
{
    Task<(string? ReferenceNo, DateTime? TransactionAt)> ExtractFromImageAsync(
        string absoluteFilePath,
        CancellationToken cancellationToken = default);
}
