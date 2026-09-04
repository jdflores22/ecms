using ECMS.Application.DTOs.StatementOfAccount;

namespace ECMS.Application.Interfaces;

public interface IStatementOfAccountService
{
    Task<ShippingLineCreditLineDto> GetOrCreateCreditLineAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ShippingLineCreditLineDto> UpdateCreditLineAsync(
        UpdateShippingLineCreditLineRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EligibleSoaBillingDto>> GetEligibleBillingsAsync(
        int? truckerId,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SoaTruckerRegisterDto>> GetEligibleTruckerRegisterAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StatementOfAccountDto>> GetAllAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto?> GetByIdAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto> CreateAsync(
        CreateStatementOfAccountRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto?> IssueAsync(
        int id,
        IssueStatementOfAccountRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto?> CancelAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto?> UploadProofAsync(
        int id,
        int truckerId,
        string proofWebPath,
        string? proofReferenceNo,
        DateTime? proofTransactionAt,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto?> VerifyAsync(
        int id,
        VerifyStatementOfAccountRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<int> GetPaymentDueCountAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);
}
