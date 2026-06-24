using ECMS.Application.DTOs.Depot;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class DepotService : IDepotService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public DepotService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<DepotDto>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Depots
            .Where(d => d.IsActive)
            .OrderBy(d => d.Name)
            .Select(d => new DepotDto(d.Id, d.Name, d.Address, d.Capacity, d.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DepotDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Depots
            .OrderBy(d => d.Name)
            .Select(d => new DepotDto(d.Id, d.Name, d.Address, d.Capacity, d.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<DepotDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        return depot is null ? null : MapToDto(depot);
    }

    public async Task<DepotDto> CreateAsync(
        CreateDepotRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var address = request.Address.Trim();

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Name is required.");
        if (request.Capacity < 1)
            throw new InvalidOperationException("Capacity must be at least 1.");

        var depot = new Depot
        {
            Name = name,
            Address = address,
            Capacity = request.Capacity,
            IsActive = true,
        };

        _db.Add(depot);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "Depot", name, cancellationToken);

        return MapToDto(depot);
    }

    public async Task<DepotDto?> UpdateAsync(
        int id,
        UpdateDepotRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        if (depot is null)
            return null;

        var name = request.Name.Trim();
        var address = request.Address.Trim();

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Name is required.");
        if (request.Capacity < 1)
            throw new InvalidOperationException("Capacity must be at least 1.");

        depot.Name = name;
        depot.Address = address;
        depot.Capacity = request.Capacity;
        depot.IsActive = request.IsActive;
        _db.Update(depot);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "Depot", name, cancellationToken);

        return MapToDto(depot);
    }

    public async Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var depot = await _db.Depots.FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        if (depot is null || !depot.IsActive)
            return false;

        depot.IsActive = false;
        _db.Update(depot);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Deactivate", "Depot", depot.Name, cancellationToken);

        return true;
    }

    private static DepotDto MapToDto(Depot d) => new(d.Id, d.Name, d.Address, d.Capacity, d.IsActive);
}
