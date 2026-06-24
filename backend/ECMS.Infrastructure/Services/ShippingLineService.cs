using ECMS.Application.DTOs.ShippingLine;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ShippingLineService : IShippingLineService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public ShippingLineService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ShippingLineDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.ShippingLines
            .OrderBy(s => s.Name)
            .Select(s => new ShippingLineDto(s.Id, s.Name, s.Code, s.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<ShippingLineDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var line = await _db.ShippingLines.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        return line is null ? null : MapToDto(line);
    }

    public async Task<ShippingLineDto> CreateAsync(
        CreateShippingLineRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        var code = NormalizeCode(request.Code);

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Name is required.");
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Code is required.");

        if (await _db.ShippingLines.AnyAsync(s => s.Code == code, cancellationToken))
            throw new InvalidOperationException($"Shipping line code '{code}' already exists.");

        var line = new ShippingLine { Name = name, Code = code, IsActive = true };
        _db.Add(line);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "ShippingLine", code, cancellationToken);

        return MapToDto(line);
    }

    public async Task<ShippingLineDto?> UpdateAsync(
        int id,
        UpdateShippingLineRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var line = await _db.ShippingLines.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (line is null)
            return null;

        var name = request.Name.Trim();
        var code = NormalizeCode(request.Code);

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Name is required.");
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Code is required.");

        if (await _db.ShippingLines.AnyAsync(s => s.Code == code && s.Id != id, cancellationToken))
            throw new InvalidOperationException($"Shipping line code '{code}' already exists.");

        line.Name = name;
        line.Code = code;
        line.IsActive = request.IsActive;
        _db.Update(line);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "ShippingLine", code, cancellationToken);

        return MapToDto(line);
    }

    public async Task<bool> DeactivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var line = await _db.ShippingLines.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (line is null || !line.IsActive)
            return false;

        line.IsActive = false;
        _db.Update(line);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Deactivate", "ShippingLine", line.Code, cancellationToken);

        return true;
    }

    private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();

    private static ShippingLineDto MapToDto(ShippingLine s) => new(s.Id, s.Name, s.Code, s.IsActive);
}
