using ECMS.Application.DTOs.PreAdvice;
using ECMS.Domain.Enums;

namespace ECMS.Application.Interfaces;

public interface IPreAdviceService
{
    Task<IReadOnlyList<PreAdviceDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<PreAdviceDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<PreAdviceDto> CreateAsync(CreatePreAdviceRequest request, int brokerId, CancellationToken cancellationToken = default);
    Task<PreAdviceDto?> UpdateAsync(int id, UpdatePreAdviceRequest request, int userId, string role, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<PreAdviceDto?> SubmitAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task<PreAdviceDto?> CancelAsync(int id, int userId, string role, string? reason = null, CancellationToken cancellationToken = default);
    Task<PreAdviceLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PreAdviceDocumentDto>> GetDocumentsAsync(int preAdviceId, int userId, string role, CancellationToken cancellationToken = default);
    Task<PreAdviceDocumentDto?> UploadDocumentAsync(
        int preAdviceId,
        int userId,
        string role,
        ContainerPhotoCategory category,
        string? comment,
        string fileName,
        string filePath,
        string contentType,
        long fileSize,
        CancellationToken cancellationToken = default);
    Task<bool> DeleteDocumentAsync(int preAdviceId, int documentId, int userId, string role, CancellationToken cancellationToken = default);
}
