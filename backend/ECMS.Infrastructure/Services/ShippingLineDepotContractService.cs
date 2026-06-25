using ECMS.Application.DTOs.CyAllocation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ShippingLineDepotContractService : IShippingLineDepotContractService
{
    private readonly IEcmsDbContext _db;
    private readonly ICyAllocationService _allocations;
    private readonly IAuditService _auditService;

    public ShippingLineDepotContractService(
        IEcmsDbContext db,
        ICyAllocationService allocations,
        IAuditService auditService)
    {
        _db = db;
        _allocations = allocations;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ShippingLineDepotContractDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var contracts = await _db.ShippingLineDepotContracts
            .Include(c => c.ShippingLine)
            .Include(c => c.Depot)
            .OrderBy(c => c.ShippingLine.Name)
            .ThenBy(c => c.Depot.Name)
            .ToListAsync(cancellationToken);

        var result = new List<ShippingLineDepotContractDto>();
        foreach (var contract in contracts)
        {
            var allocations = await _allocations.GetAllocationsAsync(
                contract.ShippingLineId,
                0,
                RoleNames.Administrator,
                cancellationToken);
            var snapshot = allocations.FirstOrDefault(a => a.DepotId == contract.DepotId);

            result.Add(new ShippingLineDepotContractDto(
                contract.Id,
                contract.ShippingLineId,
                contract.ShippingLine.Name,
                contract.DepotId,
                contract.Depot.Name,
                contract.ContractTeu,
                snapshot?.UsedTeu ?? 0m,
                snapshot?.AvailableTeu ?? contract.ContractTeu,
                contract.IsActive));
        }

        return result;
    }

    public async Task<ShippingLineDepotContractDto> CreateAsync(
        CreateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        if (request.ContractTeu < 1)
            throw new InvalidOperationException("Contract TEU must be at least 1.");

        if (!await _db.ShippingLines.AnyAsync(s => s.Id == request.ShippingLineId && s.IsActive, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        if (!await _db.Depots.AnyAsync(d => d.Id == request.DepotId && d.IsActive, cancellationToken))
            throw new InvalidOperationException("Container yard not found.");

        if (await _db.ShippingLineDepotContracts.AnyAsync(
                c => c.ShippingLineId == request.ShippingLineId && c.DepotId == request.DepotId,
                cancellationToken))
            throw new InvalidOperationException("A contract already exists for this shipping line and container yard.");

        var entity = new ShippingLineDepotContract
        {
            ShippingLineId = request.ShippingLineId,
            DepotId = request.DepotId,
            ContractTeu = request.ContractTeu,
            IsActive = true,
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "ShippingLineDepotContract", $"{entity.ShippingLineId}:{entity.DepotId}", cancellationToken);

        var all = await GetAllAsync(cancellationToken);
        return all.First(c => c.Id == entity.Id);
    }

    public async Task<ShippingLineDepotContractDto?> UpdateAsync(
        int id,
        UpdateShippingLineDepotContractRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        if (request.ContractTeu < 1)
            throw new InvalidOperationException("Contract TEU must be at least 1.");

        var entity = await _db.ShippingLineDepotContracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null)
            return null;

        entity.ContractTeu = request.ContractTeu;
        entity.IsActive = request.IsActive;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "ShippingLineDepotContract", entity.Id.ToString(), cancellationToken);

        var all = await GetAllAsync(cancellationToken);
        return all.FirstOrDefault(c => c.Id == id);
    }

    public async Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.ShippingLineDepotContracts.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (entity is null || !entity.IsActive)
            return false;

        entity.IsActive = false;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Deactivate", "ShippingLineDepotContract", entity.Id.ToString(), cancellationToken);
        return true;
    }
}
