using ECMS.Application;
using ECMS.Application.DTOs.Role;
using ECMS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class RoleService : IRoleService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public RoleService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<RoleCatalogDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _db.Roles.OrderBy(r => r.Name).ToListAsync(cancellationToken);
        return roles.Select(MapDto).ToList();
    }

    public async Task<RoleAccessDto?> GetAccessForRoleAsync(string roleName, CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName, cancellationToken);
        if (role is null) return null;
        return new RoleAccessDto(RoleAllowedPagesJson.Resolve(role.Name, role.AllowedPagesJson));
    }

    public async Task<RoleCatalogDto?> UpdateAsync(
        string name,
        UpdateRoleRequest request,
        int actorId,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == name, cancellationToken);
        if (role is null) return null;

        var capabilities = request.Capabilities
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();

        if (capabilities.Count == 0)
            throw new InvalidOperationException("At least one capability is required.");

        var defaults = RoleCatalogDefaults.Get(role.Name);
        var pool = defaults?.AllowedPages.ToHashSet(StringComparer.Ordinal) ?? new HashSet<string>(StringComparer.Ordinal);
        var invalidPages = request.AllowedPages.Where(p => !pool.Contains(p)).Distinct().ToList();
        if (invalidPages.Count > 0)
            throw new InvalidOperationException($"Pages not allowed for role {role.Name}: {string.Join(", ", invalidPages)}");

        var allowedPages = RoleAllowedPagesJson.NormalizeForRole(role.Name, request.AllowedPages);
        if (allowedPages.Count == 0)
            throw new InvalidOperationException("At least one page must be selected.");

        var description = request.Description.Trim();
        if (string.IsNullOrWhiteSpace(description))
            throw new InvalidOperationException("Description is required.");

        role.Description = description;
        role.CapabilitiesJson = RoleCapabilitiesJson.Serialize(capabilities);
        role.AllowedPagesJson = RoleAllowedPagesJson.Serialize(allowedPages);
        _db.Update(role);
        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            actorId,
            "UpdateRole",
            "User",
            $"Updated role {role.Name}",
            cancellationToken);

        return MapDto(role);
    }

    internal static RoleCatalogDto MapDto(Domain.Entities.Role role)
    {
        var defaults = RoleCatalogDefaults.Get(role.Name);
        var label = string.IsNullOrWhiteSpace(role.Label)
            ? defaults?.Label ?? role.Name
            : role.Label;
        var description = string.IsNullOrWhiteSpace(role.Description)
            ? defaults?.Description ?? string.Empty
            : role.Description;
        var capabilities = RoleCapabilitiesJson.Deserialize(role.CapabilitiesJson);
        if (capabilities.Count == 0 && defaults is not null)
            capabilities = defaults.Capabilities.ToList();

        var allowedPages = RoleAllowedPagesJson.Resolve(role.Name, role.AllowedPagesJson);

        return new RoleCatalogDto(role.Id, role.Name, label, description, capabilities, allowedPages);
    }
}
