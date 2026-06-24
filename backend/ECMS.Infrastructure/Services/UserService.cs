using ECMS.Application.DTOs.User;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public UserService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<UserListItemDto>> GetTruckersAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Users
            .Include(u => u.Role)
            .Where(u => u.Role.Name == RoleNames.Trucker && u.Status == UserStatus.Active)
            .OrderBy(u => u.FullName)
            .Select(u => new UserListItemDto(u.Id, u.Username, u.FullName ?? u.Username, u.Role.Name))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<UserAdminDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.ShippingLine)
            .Include(u => u.Depot)
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);

        return users.Select(MapAdminDto).ToList();
    }

    public async Task<AdminLookupsDto> GetAdminLookupsAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _db.Roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto(r.Id, r.Name))
            .ToListAsync(cancellationToken);

        var shippingLines = await _db.ShippingLines
            .OrderBy(s => s.Name)
            .Select(s => new ShippingLineListItemDto(s.Id, s.Name, s.Code))
            .ToListAsync(cancellationToken);

        var depots = await _db.Depots
            .Where(d => d.IsActive)
            .OrderBy(d => d.Name)
            .Select(d => new DepotLookupDto(d.Id, d.Name))
            .ToListAsync(cancellationToken);

        return new AdminLookupsDto(roles, shippingLines, depots);
    }

    public async Task<UserAdminDto?> UpdateAsync(
        int id,
        UpdateUserRequest request,
        int actorId,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.ShippingLine)
            .Include(u => u.Depot)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user is null) return null;

        if (id == actorId && request.Status != UserStatus.Active.ToString())
            throw new InvalidOperationException("You cannot deactivate your own account.");

        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email == request.Email, cancellationToken))
            throw new InvalidOperationException("Email is already in use.");

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.Role, cancellationToken)
            ?? throw new InvalidOperationException("Invalid role.");

        if (!Enum.TryParse<UserStatus>(request.Status, out var status))
            throw new InvalidOperationException("Invalid status.");

        int? shippingLineId = null;
        int? depotId = null;

        if (request.Role == RoleNames.ShippingLineEvaluator)
        {
            if (!request.ShippingLineId.HasValue)
                throw new InvalidOperationException("Shipping line is required for evaluators.");
            shippingLineId = request.ShippingLineId;
        }
        else if (request.Role == RoleNames.DepotPersonnel)
        {
            if (!request.DepotId.HasValue)
                throw new InvalidOperationException("Depot is required for depot personnel.");
            depotId = request.DepotId;
        }

        user.Email = request.Email;
        user.FullName = request.FullName;
        user.RoleId = role.Id;
        user.Status = status;
        user.ShippingLineId = shippingLineId;
        user.DepotId = depotId;

        _db.Update(user);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(actorId, "Update", "User", user.Username, cancellationToken);

        user.Role = role;
        if (shippingLineId.HasValue)
            user.ShippingLine = await _db.ShippingLines.FirstAsync(s => s.Id == shippingLineId, cancellationToken);
        else
            user.ShippingLine = null;

        if (depotId.HasValue)
            user.Depot = await _db.Depots.FirstAsync(d => d.Id == depotId, cancellationToken);
        else
            user.Depot = null;

        return MapAdminDto(user);
    }

    private static UserAdminDto MapAdminDto(Domain.Entities.User u) => new(
        u.Id,
        u.Username,
        u.Email,
        u.FullName ?? u.Username,
        u.Role.Name,
        u.Status.ToString(),
        u.ShippingLineId,
        u.ShippingLine?.Name,
        u.DepotId,
        u.Depot?.Name);
}
