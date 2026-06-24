namespace ECMS.Application.DTOs.User;

public record UserListItemDto(int Id, string Username, string FullName, string Role);

public record UserAdminDto(
    int Id,
    string Username,
    string Email,
    string FullName,
    string Role,
    string Status,
    int? ShippingLineId,
    string? ShippingLineName,
    int? DepotId,
    string? DepotName);

public record RoleDto(int Id, string Name);

public record ShippingLineListItemDto(int Id, string Name, string Code);

public record AdminLookupsDto(
    IReadOnlyList<RoleDto> Roles,
    IReadOnlyList<ShippingLineListItemDto> ShippingLines,
    IReadOnlyList<DepotLookupDto> Depots);

public record DepotLookupDto(int Id, string Name);

public record UpdateUserRequest(
    string Email,
    string FullName,
    string Role,
    string Status,
    int? ShippingLineId,
    int? DepotId);
