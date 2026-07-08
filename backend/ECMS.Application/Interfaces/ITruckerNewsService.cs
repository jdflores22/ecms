using ECMS.Application.DTOs.News;

namespace ECMS.Application.Interfaces;

public interface ITruckerNewsService
{
    Task<IReadOnlyList<TruckerNewsFeedItemDto>> GetPublishedFeedAsync(CancellationToken cancellationToken = default);
    Task<TruckerNewsDetailDto?> GetPublishedByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TruckerNewsAdminDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TruckerNewsAdminDto> CreateAsync(int actorUserId, CreateTruckerNewsRequest request, CancellationToken cancellationToken = default);
    Task<TruckerNewsAdminDto> UpdateAsync(int id, UpdateTruckerNewsRequest request, CancellationToken cancellationToken = default);
    Task<TruckerNewsAdminDto> PublishAsync(int id, int actorUserId, CancellationToken cancellationToken = default);
    Task<TruckerNewsAdminDto> SetImageAsync(int id, string imagePath, string fileName, string contentType, long fileSize, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
