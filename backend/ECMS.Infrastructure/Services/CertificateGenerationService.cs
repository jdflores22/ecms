using ECMS.Application.Certificates;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace ECMS.Infrastructure.Services;

public class CertificateGenerationService : ICertificateGenerationService
{
    private readonly IEcmsDbContext _db;
    private readonly ICertificateTemplateService _templates;
    private readonly IAuditService _auditService;
    private readonly string _contentRootPath;
    private readonly string _uploadRoot;

    public CertificateGenerationService(
        IEcmsDbContext db,
        ICertificateTemplateService templates,
        IAuditService auditService,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        _db = db;
        _templates = templates;
        _auditService = auditService;
        _contentRootPath = environment.ContentRootPath;
        _uploadRoot = configuration["FileStorage:UploadPath"] ?? "uploads";
    }

    public byte[] RenderPreview(
        CertificateDocumentType documentType,
        string layoutJson,
        AtwCertificateMergeData? sampleData = null)
    {
        var layout = CertificateJson.ParseLayout(layoutJson, documentType);
        return CertificatePdfRenderer.RenderAtw(
            layout,
            sampleData ?? CertificateJson.GetSampleData(documentType),
            _contentRootPath);
    }

    public Task AttachAtwCertificateAsync(
        int withdrawalRequestId,
        int generatedByUserId,
        CancellationToken cancellationToken = default)
        => AttachCertificateAsync(
            withdrawalRequestId,
            generatedByUserId,
            CertificateDocumentType.Atw,
            WithdrawalDocumentType.AtwCertificate,
            null,
            null,
            BuildIssueMergeData,
            "GenerateCertificate",
            cancellationToken);

    public async Task AttachCyContainerReleaseCertificateAsync(
        int withdrawalRequestId,
        int lineId,
        int generatedByUserId,
        CancellationToken cancellationToken = default)
    {
        var entity = await LoadWithdrawalAsync(withdrawalRequestId, cancellationToken);
        var line = entity.Lines.FirstOrDefault(l => l.Id == lineId)
            ?? throw new InvalidOperationException("Container line not found.");

        var displayName = $"CY-RELEASE-{SanitizeFileName(line.ContainerNoNormalized)}-{SanitizeFileName(entity.AtwNumber)}.pdf";
        await AttachCertificateAsync(
            withdrawalRequestId,
            generatedByUserId,
            CertificateDocumentType.CyContainerRelease,
            WithdrawalDocumentType.CyContainerReleaseCertificate,
            displayName,
            displayName,
            (e, releasedAt) => BuildCyReleaseMergeData(e, line, releasedAt),
            "GenerateCyReleaseCertificate",
            cancellationToken);
    }

    public Task AttachAtwReleaseCertificateAsync(
        int withdrawalRequestId,
        int generatedByUserId,
        CancellationToken cancellationToken = default)
    {
        return AttachCertificateAsync(
            withdrawalRequestId,
            generatedByUserId,
            CertificateDocumentType.AtwRelease,
            WithdrawalDocumentType.AtwReleaseCertificate,
            null,
            null,
            BuildAtwReleaseMergeData,
            "GenerateAtwReleaseCertificate",
            cancellationToken);
    }

    private async Task AttachCertificateAsync(
        int withdrawalRequestId,
        int generatedByUserId,
        CertificateDocumentType certType,
        WithdrawalDocumentType docType,
        string? displayNameOverride,
        string? dedupeFileName,
        Func<WithdrawalRequest, DateTime, AtwCertificateMergeData> buildMerge,
        string auditAction,
        CancellationToken cancellationToken)
    {
        var entity = await LoadWithdrawalAsync(withdrawalRequestId, cancellationToken);
        var releasedAt = PhilippinesTime.UtcNow;

        var layoutJson = await _templates.GetActiveLayoutJsonAsync(entity.ShippingLineId, certType, cancellationToken)
            ?? CertificateJson.GetDefaultLayoutJson(certType);

        var mergeData = buildMerge(entity, releasedAt);
        var pdfBytes = CertificatePdfRenderer.RenderAtw(
            CertificateJson.ParseLayout(layoutJson, certType),
            mergeData,
            _contentRootPath);

        var uploadDir = ResolveUploadDir();
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid():N}.pdf";
        var absolutePath = Path.Combine(uploadDir, storedName);
        await File.WriteAllBytesAsync(absolutePath, pdfBytes, cancellationToken);

        var relativePath = $"/uploads/{storedName}";
        var fileName = displayNameOverride ?? ResolveDisplayName(certType, entity);

        if (dedupeFileName is not null)
        {
            var existingByName = await _db.WithdrawalDocuments
                .Where(d => d.WithdrawalRequestId == withdrawalRequestId
                    && d.DocumentType == docType
                    && d.FileName == dedupeFileName)
                .ToListAsync(cancellationToken);
            foreach (var doc in existingByName)
                _db.Remove(doc);
        }
        else
        {
            var existing = await _db.WithdrawalDocuments
                .Where(d => d.WithdrawalRequestId == withdrawalRequestId && d.DocumentType == docType)
                .ToListAsync(cancellationToken);
            foreach (var doc in existing)
                _db.Remove(doc);
        }

        var document = new WithdrawalDocument
        {
            WithdrawalRequestId = withdrawalRequestId,
            DocumentType = docType,
            FileName = fileName,
            FilePath = relativePath,
            ContentType = "application/pdf",
            FileSize = pdfBytes.LongLength,
            UploadedById = generatedByUserId,
        };

        _db.Add(document);
        _auditService.QueueLog(generatedByUserId, auditAction, "Withdrawal", entity.ReferenceNo);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<WithdrawalRequest> LoadWithdrawalAsync(int withdrawalRequestId, CancellationToken cancellationToken)
    {
        return await _db.WithdrawalRequests
            .Include(w => w.ShippingLine)
            .Include(w => w.Trucker)
            .Include(w => w.CurrentDepot)
            .Include(w => w.Lines)
                .ThenInclude(l => l.ContainerSize)
            .Include(w => w.Lines)
                .ThenInclude(l => l.ContainerType)
            .FirstOrDefaultAsync(w => w.Id == withdrawalRequestId, cancellationToken)
            ?? throw new InvalidOperationException("Withdrawal request not found.");
    }

    private string ResolveUploadDir()
    {
        return Path.IsPathRooted(_uploadRoot)
            ? _uploadRoot
            : Path.Combine(Directory.GetCurrentDirectory(), _uploadRoot);
    }

    private static string ResolveDisplayName(CertificateDocumentType certType, WithdrawalRequest entity)
    {
        var atw = SanitizeFileName(entity.AtwNumber);
        return certType switch
        {
            CertificateDocumentType.Atw => $"ATW-{atw}.pdf",
            CertificateDocumentType.AtwRelease => $"ATW-RELEASE-{atw}.pdf",
            _ => $"CERT-{atw}.pdf",
        };
    }

    private static AtwCertificateMergeData BuildIssueMergeData(WithdrawalRequest entity, DateTime _)
        => BuildBaseMergeData(entity, null, entity.Lines.OrderBy(l => l.LineNo));

    private static AtwCertificateMergeData BuildAtwReleaseMergeData(WithdrawalRequest entity, DateTime releasedAt)
    {
        var releasedLines = entity.Lines
            .Where(l => l.LineStatus == WithdrawalLineStatus.Released)
            .OrderBy(l => l.LineNo);
        return BuildBaseMergeData(entity, releasedAt, releasedLines);
    }

    private static AtwCertificateMergeData BuildCyReleaseMergeData(
        WithdrawalRequest entity,
        WithdrawalRequestLine line,
        DateTime releasedAt)
    {
        var data = BuildBaseMergeData(entity, releasedAt, Enumerable.Empty<WithdrawalRequestLine>());
        data.ContainerNo = line.ContainerNoNormalized;
        data.ContainerSize = StripFootMark(line.ContainerSize.Label);
        data.ContainerType = line.ContainerType.Code;
        return data;
    }

    private static AtwCertificateMergeData BuildBaseMergeData(
        WithdrawalRequest entity,
        DateTime? releasedAt,
        IEnumerable<WithdrawalRequestLine> lines)
    {
        var data = new AtwCertificateMergeData
        {
            AtwNumber = entity.AtwNumber,
            ReferenceNo = entity.ReferenceNo,
            ShippingLineName = entity.ShippingLine.Name,
            TruckerName = entity.Trucker.FullName ?? entity.Trucker.Username,
            CurrentDepotName = entity.CurrentDepot.Name,
            Destination = entity.Destination,
            IssueDate = FormatDate(entity.IssueDate),
            ExpirationDate = FormatDate(entity.ExpirationDate),
            Remarks = entity.Remarks,
            ContainerLines = lines
                .Select(l => new AtwContainerLineMergeData
                {
                    ContainerNo = l.ContainerNoNormalized,
                    Size = StripFootMark(l.ContainerSize.Label),
                    Type = l.ContainerType.Code,
                })
                .ToList(),
        };

        if (releasedAt.HasValue)
        {
            data.ReleasedDate = FormatDate(PhilippinesTime.ToDateOnly(releasedAt.Value));
            data.ReleasedAt = FormatDateTime(releasedAt.Value);
            data.ReleasedByDepotName = entity.CurrentDepot.Name;
        }

        return data;
    }

    private static string FormatDate(DateOnly date)
        => date.ToString("MMMM d, yyyy");

    private static string FormatDateTime(DateTime utc)
    {
        var normalized = utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        var local = TimeZoneInfo.ConvertTimeFromUtc(normalized, PhilippinesTime.Zone);
        return local.ToString("MMMM d, yyyy h:mm tt");
    }

    private static string StripFootMark(string label)
        => label.Trim().TrimEnd('\'');

    private static string SanitizeFileName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "unknown";

        var invalid = Path.GetInvalidFileNameChars();
        return new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
    }
}
