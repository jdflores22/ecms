using ECMS.Application.DTOs.Container;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ContainerService : IContainerService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public ContainerService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ContainerDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Containers
            .Include(c => c.ShippingLine)
            .OrderBy(c => c.ContainerNo)
            .Select(c => new ContainerDto(
                c.Id, c.ContainerNo, c.Size, c.Type, c.ShippingLineId, c.ShippingLine.Name))
            .ToListAsync(cancellationToken);
    }

    public async Task<ContainerDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var container = await _db.Containers
            .Include(c => c.ShippingLine)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        return container is null ? null : MapToDto(container);
    }

    public async Task<ContainerDto> CreateAsync(
        CreateContainerRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var containerNo = NormalizeContainerNo(request.ContainerNo);
        var size = request.Size.Trim();
        var type = request.Type.Trim().ToUpperInvariant();

        ValidateFields(containerNo, size, type);

        if (!await _db.ShippingLines.AnyAsync(s => s.Id == request.ShippingLineId, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        if (await _db.Containers.AnyAsync(c => c.ContainerNo == containerNo, cancellationToken))
            throw new InvalidOperationException($"Container number '{containerNo}' already exists.");

        var container = new Container
        {
            ContainerNo = containerNo,
            Size = size,
            Type = type,
            ShippingLineId = request.ShippingLineId,
        };

        _db.Add(container);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "Container", containerNo, cancellationToken);

        container = await _db.Containers
            .Include(c => c.ShippingLine)
            .FirstAsync(c => c.Id == container.Id, cancellationToken);

        return MapToDto(container);
    }

    public async Task<ContainerDto?> UpdateAsync(
        int id,
        UpdateContainerRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var container = await _db.Containers
            .Include(c => c.ShippingLine)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (container is null)
            return null;

        var containerNo = NormalizeContainerNo(request.ContainerNo);
        var size = request.Size.Trim();
        var type = request.Type.Trim().ToUpperInvariant();

        ValidateFields(containerNo, size, type);

        if (!await _db.ShippingLines.AnyAsync(s => s.Id == request.ShippingLineId, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        if (await _db.Containers.AnyAsync(c => c.ContainerNo == containerNo && c.Id != id, cancellationToken))
            throw new InvalidOperationException($"Container number '{containerNo}' already exists.");

        container.ContainerNo = containerNo;
        container.Size = size;
        container.Type = type;
        container.ShippingLineId = request.ShippingLineId;
        _db.Update(container);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "Container", containerNo, cancellationToken);

        container = await _db.Containers
            .Include(c => c.ShippingLine)
            .FirstAsync(c => c.Id == id, cancellationToken);

        return MapToDto(container);
    }

    public async Task<bool> DeleteAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var container = await _db.Containers.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (container is null)
            return false;

        if (await _db.PreAdvices.AnyAsync(p => p.ContainerId == id, cancellationToken))
            throw new InvalidOperationException("Cannot delete a container linked to pre-advice requests.");

        _db.Remove(container);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Delete", "Container", container.ContainerNo, cancellationToken);

        return true;
    }

    private static void ValidateFields(string containerNo, string size, string type)
    {
        if (string.IsNullOrWhiteSpace(containerNo))
            throw new InvalidOperationException("Container number is required.");
        if (string.IsNullOrWhiteSpace(size))
            throw new InvalidOperationException("Size is required.");
        if (string.IsNullOrWhiteSpace(type))
            throw new InvalidOperationException("Type is required.");
    }

    private static string NormalizeContainerNo(string containerNo) => containerNo.Trim().ToUpperInvariant();

    private static ContainerDto MapToDto(Container c) =>
        new(c.Id, c.ContainerNo, c.Size, c.Type, c.ShippingLineId, c.ShippingLine.Name);
}
