using ECMS.Application.Certificates;
using ECMS.Application.DTOs.Certificate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class CertificateTemplateService : ICertificateTemplateService
{
    private readonly IEcmsDbContext _db;
    private readonly IAuditService _auditService;

    public CertificateTemplateService(IEcmsDbContext db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<CertificateTemplateDto>> GetAllAsync(
        int? shippingLineId,
        CertificateDocumentType? documentType,
        CancellationToken cancellationToken = default)
    {
        var query = _db.CertificateTemplates.AsQueryable();
        if (shippingLineId.HasValue)
            query = query.Where(t => t.ShippingLineId == shippingLineId.Value);
        if (documentType.HasValue)
            query = query.Where(t => t.DocumentType == documentType.Value);

        return await query
            .OrderByDescending(t => t.IsActive)
            .ThenByDescending(t => t.UpdatedAt)
            .Join(
                _db.ShippingLines,
                t => t.ShippingLineId,
                s => s.Id,
                (t, s) => new CertificateTemplateDto(
                    t.Id,
                    t.ShippingLineId,
                    s.Name,
                    t.DocumentType,
                    t.Name,
                    t.LayoutJson,
                    t.IsActive,
                    t.UpdatedAt,
                    t.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<CertificateTemplateDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _db.CertificateTemplates
            .Where(t => t.Id == id)
            .Join(
                _db.ShippingLines,
                t => t.ShippingLineId,
                s => s.Id,
                (t, s) => new CertificateTemplateDto(
                    t.Id,
                    t.ShippingLineId,
                    s.Name,
                    t.DocumentType,
                    t.Name,
                    t.LayoutJson,
                    t.IsActive,
                    t.UpdatedAt,
                    t.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<CertificateTemplateDto> CreateAsync(
        CreateCertificateTemplateRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Template name is required.");

        if (!await _db.ShippingLines.AnyAsync(s => s.Id == request.ShippingLineId, cancellationToken))
            throw new InvalidOperationException("Shipping line not found.");

        var layoutJson = string.IsNullOrWhiteSpace(request.LayoutJson)
            ? CertificateJson.GetDefaultLayoutJson(request.DocumentType)
            : request.LayoutJson.Trim();

        CertificateJson.ParseLayout(layoutJson, request.DocumentType);

        var entity = new CertificateTemplate
        {
            ShippingLineId = request.ShippingLineId,
            DocumentType = request.DocumentType,
            Name = name,
            LayoutJson = layoutJson,
            IsActive = false,
            UpdatedAt = PhilippinesTime.UtcNow,
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Create", "CertificateTemplate", name, cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<CertificateTemplateDto?> UpdateAsync(
        int id,
        UpdateCertificateTemplateRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.CertificateTemplates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (entity is null)
            return null;

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Template name is required.");

        CertificateJson.ParseLayout(request.LayoutJson);

        entity.Name = name;
        entity.LayoutJson = request.LayoutJson.Trim();
        entity.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Update", "CertificateTemplate", name, cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> ActivateAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var entity = await _db.CertificateTemplates.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (entity is null)
            return false;

        var siblings = await _db.CertificateTemplates
            .Where(t =>
                t.ShippingLineId == entity.ShippingLineId
                && t.DocumentType == entity.DocumentType
                && t.Id != entity.Id)
            .ToListAsync(cancellationToken);

        foreach (var sibling in siblings)
        {
            sibling.IsActive = false;
            sibling.UpdatedAt = PhilippinesTime.UtcNow;
            _db.Update(sibling);
        }

        entity.IsActive = true;
        entity.UpdatedAt = PhilippinesTime.UtcNow;
        _db.Update(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "Activate", "CertificateTemplate", entity.Name, cancellationToken);

        return true;
    }

    public async Task<string?> GetActiveLayoutJsonAsync(
        int shippingLineId,
        CertificateDocumentType documentType,
        CancellationToken cancellationToken = default)
    {
        var layout = await _db.CertificateTemplates
            .Where(t => t.ShippingLineId == shippingLineId && t.DocumentType == documentType && t.IsActive)
            .Select(t => t.LayoutJson)
            .FirstOrDefaultAsync(cancellationToken);

        return layout;
    }

    public IReadOnlyList<CertificateMergeFieldDto> GetMergeFields(CertificateDocumentType documentType)
    {
        return documentType switch
        {
            CertificateDocumentType.Atw => AtwCertificateFields.All
                .Select(f => new CertificateMergeFieldDto(f.Key, f.Label, f.Kind))
                .ToList(),
            CertificateDocumentType.AtwRelease => ReleaseCertificateFields.AtwRelease
                .Select(f => new CertificateMergeFieldDto(f.Key, f.Label, f.Kind))
                .ToList(),
            CertificateDocumentType.CyContainerRelease => ReleaseCertificateFields.CyContainerRelease
                .Select(f => new CertificateMergeFieldDto(f.Key, f.Label, f.Kind))
                .ToList(),
            _ => Array.Empty<CertificateMergeFieldDto>(),
        };
    }
}
