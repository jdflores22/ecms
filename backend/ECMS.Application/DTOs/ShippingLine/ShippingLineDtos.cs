namespace ECMS.Application.DTOs.ShippingLine;

public record ShippingLineDto(int Id, string Name, string Code, bool IsActive);

public record CreateShippingLineRequest(string Name, string Code);

public record UpdateShippingLineRequest(string Name, string Code, bool IsActive);
