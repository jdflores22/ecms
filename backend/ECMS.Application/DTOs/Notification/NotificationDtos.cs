namespace ECMS.Application.DTOs.Notification;

public record NotificationDto(
    int Id,
    string Title,
    string Message,
    string Category,
    string? LinkPath,
    bool IsRead,
    DateTime CreatedAt,
    string? ReferenceNo,
    string? ActorName);

public record NotificationPageDto(
    IReadOnlyList<NotificationDto> Items,
    int Total,
    int UnreadCount,
    int Page,
    int PageSize);
