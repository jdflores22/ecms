using ECMS.Application.DTOs.ContainerCatalog;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ContainerTypeService : IContainerTypeService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public ContainerTypeService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ContainerTypeDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.ContainerTypes
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Code)
            .Select(t => new ContainerTypeDto(t.Id, t.Code, t.Label, t.SortOrder, t.IsActive))
            .ToListAsync(cancellationToken);

    public async Task<ContainerTypeDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _db.ContainerTypes.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        return item is null ? null : Map(item);
    }

    public async Task<ContainerTypeDto> CreateAsync(
        CreateContainerTypeRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var label = request.Label.Trim();
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Container type code is required.");
        if (string.IsNullOrWhiteSpace(label))
            throw new InvalidOperationException("Container type label is required.");

        if (await _db.ContainerTypes.AnyAsync(t => t.Code == code, cancellationToken))
            throw new InvalidOperationException($"Container type code '{code}' already exists.");

        var entity = new ContainerType
        {
            Code = code,
            Label = label,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "ContainerType", code, cancellationToken);

        return Map(entity);
    }

    public async Task<ContainerTypeDto?> UpdateAsync(
        int id,
        UpdateContainerTypeRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.ContainerTypes.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (entity is null)
            return null;

        var code = request.Code.Trim().ToUpperInvariant();
        var label = request.Label.Trim();
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Container type code is required.");
        if (string.IsNullOrWhiteSpace(label))
            throw new InvalidOperationException("Container type label is required.");

        if (await _db.ContainerTypes.AnyAsync(t => t.Code == code && t.Id != id, cancellationToken))
            throw new InvalidOperationException($"Container type code '{code}' already exists.");

        entity.Code = code;
        entity.Label = label;
        entity.SortOrder = request.SortOrder;
        entity.IsActive = request.IsActive;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "ContainerType", code, cancellationToken);

        return Map(entity);
    }

    public async Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ContainerTypes.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (entity is null)
            return false;

        entity.IsActive = false;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Deactivate", "ContainerType", entity.Code, cancellationToken);

        return true;
    }

    private static ContainerTypeDto Map(ContainerType t) => new(t.Id, t.Code, t.Label, t.SortOrder, t.IsActive);
}
