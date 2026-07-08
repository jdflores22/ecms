namespace ECMS.Application.DTOs.News;

public record CreateTruckerNewsRequest(string Title, string Body);

public record UpdateTruckerNewsRequest(string Title, string Body);

public record TruckerNewsFeedItemDto(
    int Id,
    string Title,
    string? ImagePath,
    DateTime? PublishedAt);

public record TruckerNewsDetailDto(
    int Id,
    string Title,
    string Body,
    string? ImagePath,
    bool IsPublished,
    DateTime? PublishedAt,
    string CreatedByName,
    DateTime CreatedAt);

public record TruckerNewsAdminDto(
    int Id,
    string Title,
    string Body,
    string? ImagePath,
    bool IsPublished,
    DateTime? PublishedAt,
    string CreatedByName,
    DateTime CreatedAt);
