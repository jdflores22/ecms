using ECMS.Application.DTOs.ContainerCatalog;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ContainerSizeService : IContainerSizeService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public ContainerSizeService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ContainerSizeDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.ContainerSizes
            .OrderBy(s => s.SortOrder)
            .ThenBy(s => s.Label)
            .Select(s => new ContainerSizeDto(s.Id, s.Label, s.Teu, s.SortOrder, s.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<ContainerSizeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _db.ContainerSizes.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        return item is null ? null : Map(item);
    }

    public async Task<ContainerSizeDto> CreateAsync(
        CreateContainerSizeRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var label = request.Label.Trim();
        if (string.IsNullOrWhiteSpace(label))
            throw new InvalidOperationException("Container size label is required.");

        if (await _db.ContainerSizes.AnyAsync(s => s.Label == label, cancellationToken))
            throw new InvalidOperationException($"Container size '{label}' already exists.");

        if (request.Teu <= 0)
            throw new InvalidOperationException("TEU must be greater than zero.");

        var entity = new ContainerSize
        {
            Label = label,
            Teu = request.Teu,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "ContainerSize", label, cancellationToken);

        return Map(entity);
    }

    public async Task<ContainerSizeDto?> UpdateAsync(
        int id,
        UpdateContainerSizeRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ContainerSizes.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null)
            return null;

        var label = request.Label.Trim();
        if (string.IsNullOrWhiteSpace(label))
            throw new InvalidOperationException("Container size label is required.");

        if (await _db.ContainerSizes.AnyAsync(s => s.Label == label && s.Id != id, cancellationToken))
            throw new InvalidOperationException($"Container size '{label}' already exists.");

        if (request.Teu <= 0)
            throw new InvalidOperationException("TEU must be greater than zero.");

        entity.Label = label;
        entity.Teu = request.Teu;
        entity.SortOrder = request.SortOrder;
        entity.IsActive = request.IsActive;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "ContainerSize", label, cancellationToken);

        return Map(entity);
    }

    public async Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ContainerSizes.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null)
            return false;

        entity.IsActive = false;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Deactivate", "ContainerSize", entity.Label, cancellationToken);

        return true;
    }

    private static ContainerSizeDto Map(ContainerSize s) => new(s.Id, s.Label, s.Teu, s.SortOrder, s.IsActive);
}
