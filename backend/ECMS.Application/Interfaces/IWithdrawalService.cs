using ECMS.Application.DTOs.Withdrawal;
using ECMS.Domain.Enums;

namespace ECMS.Application.Interfaces;

public interface IWithdrawalService
{
    Task<IReadOnlyList<WithdrawalDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<WithdrawalDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<int> GetPendingReviewCountAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<int> GetPendingActionCountAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<WithdrawalLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);
    Task<WithdrawalFormConfigDto> GetFormConfigAsync(CancellationToken cancellationToken = default);
    Task<WithdrawalAtwNumberCheckDto> CheckAtwNumberAsync(string atwNumber, int? excludeWithdrawalId, CancellationToken cancellationToken = default);
    Task<WithdrawalYardCheckDto> CheckContainerInYardAsync(
        int depotId,
        string containerNo,
        int containerSizeId,
        int containerTypeId,
        CancellationToken cancellationToken = default);
    Task<bool> DeleteDraftAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<WithdrawalGatePassDto?> GetGatePassAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<EvaluatorAtwLookupsDto> GetEvaluatorLookupsAsync(int evaluatorId, CancellationToken cancellationToken = default);
    Task<WithdrawalDuplicateCheckDto> CheckDuplicateAsync(CheckWithdrawalDuplicateRequest request, CancellationToken cancellationToken = default);
    Task<WithdrawalDto> CreateAsync(CreateWithdrawalRequest request, int truckerId, CancellationToken cancellationToken = default);
    Task<WithdrawalDto> IssueAtwAsync(IssueAtwRequest request, int evaluatorId, CancellationToken cancellationToken = default);
    Task<WithdrawalDto?> UpdateAsync(int id, UpdateWithdrawalRequest request, int userId, string role, CancellationToken cancellationToken = default);
    Task<WithdrawalDto?> SubmitAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<WithdrawalDto?> ApproveAsync(int id, int userId, string role, string? remarks, CancellationToken cancellationToken = default);
    Task<WithdrawalDto?> RejectAsync(int id, int userId, string role, string remarks, CancellationToken cancellationToken = default);
    Task<WithdrawalDto?> ReleaseAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WithdrawalDocumentDto>> GetDocumentsAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<WithdrawalDocumentDto> AddDocumentAsync(
        int id,
        int userId,
        string role,
        WithdrawalDocumentType documentType,
        string fileName,
        string filePath,
        string contentType,
        long fileSize,
        CancellationToken cancellationToken = default);
    Task<bool> DeleteDocumentAsync(int withdrawalId, int documentId, int userId, string role, CancellationToken cancellationToken = default);
}
