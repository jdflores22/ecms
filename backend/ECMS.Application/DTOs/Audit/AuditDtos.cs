namespace ECMS.Application.DTOs.Audit;

public record AuditLogDto(
    int Id,
    int UserId,
    string Username,
    string Action,
    string Module,
    string? Details,
    DateTime Timestamp);

public record AuditLogPageDto(
    IReadOnlyList<AuditLogDto> Items,
    int Total,
    int Page,
    int PageSize);

public record AuditLogQuery(
    int? UserId = null,
    string? Module = null,
    string? Action = null,
    DateTime? From = null,
    DateTime? To = null,
    int Page = 1,
    int PageSize = 50);
