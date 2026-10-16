namespace ECMS.Application.DTOs.ShippingLine;

public record ShippingLineDto(int Id, string Name, string Code, bool IsActive, string? LogicteckFeedCode);

public record CreateShippingLineRequest(string Name, string Code, string? LogicteckFeedCode = null);

public record UpdateShippingLineRequest(string Name, string Code, bool IsActive, string? LogicteckFeedCode = null);
