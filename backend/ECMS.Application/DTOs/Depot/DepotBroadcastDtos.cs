namespace ECMS.Application.DTOs.Depot;

public record CreateDepotBroadcastRequest(string Subject, string Message);

public record DepotBroadcastDto(
    int Id,
    string Subject,
    string Message,
    int RecipientCount,
    string CreatedByName,
    DateTime CreatedAt);
