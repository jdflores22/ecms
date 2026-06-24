namespace ECMS.Application.DTOs.Role;

public record RoleCatalogDto(
    int Id,
    string Name,
    string Label,
    string Description,
    IReadOnlyList<string> Capabilities,
    IReadOnlyList<string> AllowedPages);

public record UpdateRoleRequest(
    string Description,
    IReadOnlyList<string> Capabilities,
    IReadOnlyList<string> AllowedPages);

public record RoleAccessDto(IReadOnlyList<string> AllowedPages);
