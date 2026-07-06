using ECMS.Application.Certificates;
using ECMS.Application.DTOs.Certificate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ECMS.Infrastructure.Services;

public class CertificateGenerationService : ICertificateGenerationService
{
    private readonly IEcmsDbContext _db;
    private readonly ICertificateTemplateService _templates;
    private readonly ICertificateVerificationService _verification;
    private readonly IAuditService _auditService;
    private readonly ILogger<CertificateGenerationService> _logger;
    private readonly string _contentRootPath;
    private readonly string _uploadRoot;

    public CertificateGenerationService(
        IEcmsDbContext db,
        ICertificateTemplateService templates,
        ICertificateVerificationService verification,
        IAuditService auditService,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<CertificateGenerationService> logger)
    {
        _db = db;
        _templates = templates;
        _verification = verification;
        _auditService = auditService;
        _logger = logger;
        _contentRootPath = environment.ContentRootPath;
        _uploadRoot = configuration["FileStorage:UploadPath"] ?? "uploads";
    }

    public byte[] RenderPreview(
        CertificateDocumentType documentType,
        string layoutJson,
        AtwCertificateMergeData? sampleData = null)
    {
        var layout = CertificateJson.ParseLayout(layoutJson, documentType);
        var data = sampleData ?? CertificateJson.GetSampleData(documentType);
        data.VerificationUrl ??= _verification.BuildVerifyUrl(_verification.GeneratePlainToken());
        return CertificatePdfRenderer.RenderAtw(
            layout,
            data,
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
            cancellationToken: cancellationToken);

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
            lineId,
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
            cancellationToken: cancellationToken);
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
        int? withdrawalRequestLineId = null,
        CancellationToken cancellationToken = default)
    {
        var entity = await LoadWithdrawalAsync(withdrawalRequestId, cancellationToken);
        var releasedAt = PhilippinesTime.UtcNow;

        var activeLayoutJson = await _templates.GetActiveLayoutJsonAsync(
            entity.ShippingLineId,
            certType,
            cancellationToken);

        string layoutJson;
        if (string.IsNullOrWhiteSpace(activeLayoutJson))
        {
            layoutJson = CertificateJson.GetDefaultLayoutJson(certType);
            _logger.LogWarning(
                "No active certificate template for shipping line {ShippingLineId} and document type {DocumentType}. Using default layout for withdrawal {ReferenceNo}.",
                entity.ShippingLineId,
                certType,
                entity.ReferenceNo);
        }
        else
        {
            layoutJson = activeLayoutJson;
        }

        var (layout, usedFallback) = CertificateJson.ParseLayoutWithFallback(layoutJson, certType);
        if (!string.IsNullOrWhiteSpace(activeLayoutJson) && usedFallback)
        {
            _logger.LogError(
                "Active certificate template for shipping line {ShippingLineId} and document type {DocumentType} could not be parsed. Using default layout for withdrawal {ReferenceNo}.",
                entity.ShippingLineId,
                certType,
                entity.ReferenceNo);
        }

        var mergeData = buildMerge(entity, releasedAt);
        mergeData.IssuedByName = await ResolveIssuerNameAsync(generatedByUserId, cancellationToken);
        var plainToken = _verification.GeneratePlainToken();
        mergeData.VerificationUrl = _verification.BuildVerifyUrl(plainToken);

        var pdfBytes = CertificatePdfRenderer.RenderAtw(
            layout,
            mergeData,
            _contentRootPath);

        var fingerprint = _verification.ComputeDocumentFingerprint(pdfBytes);

        var uploadDir = ResolveUploadDir();
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid():N}.pdf";
        var absolutePath = Path.Combine(uploadDir, storedName);
        await File.WriteAllBytesAsync(absolutePath, pdfBytes, cancellationToken);

        var relativePath = $"/uploads/{storedName}";
        var fileName = displayNameOverride ?? ResolveDisplayName(certType, entity);

        var documentsToRemove = new List<WithdrawalDocument>();
        if (dedupeFileName is not null)
        {
            documentsToRemove = await _db.WithdrawalDocuments
                .Where(d => d.WithdrawalRequestId == withdrawalRequestId
                    && d.DocumentType == docType
                    && d.FileName == dedupeFileName)
                .ToListAsync(cancellationToken);
        }
        else
        {
            documentsToRemove = await _db.WithdrawalDocuments
                .Where(d => d.WithdrawalRequestId == withdrawalRequestId && d.DocumentType == docType)
                .ToListAsync(cancellationToken);
        }

        if (documentsToRemove.Count > 0)
        {
            await _verification.RevokeByDocumentIdsAsync(
                documentsToRemove.Select(d => d.Id),
                "Superseded by newly generated certificate",
                cancellationToken);
            foreach (var doc in documentsToRemove)
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
        await _db.SaveChangesAsync(cancellationToken);

        await _verification.RegisterAsync(
            plainToken,
            withdrawalRequestId,
            document.Id,
            certType,
            fingerprint,
            new CertificateVerificationRegistration(
                entity.AtwNumber,
                entity.ReferenceNo,
                entity.ShippingLine.Name,
                entity.Trucker.FullName ?? entity.Trucker.Username,
                entity.CurrentDepot.Name,
                mergeData.ContainerNo ?? string.Empty,
                mergeData.ContainerSize ?? string.Empty,
                mergeData.ContainerType ?? string.Empty,
                mergeData.Destination ?? string.Empty,
                withdrawalRequestLineId),
            cancellationToken);

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
            GeneratedAt = FormatDateTime(PhilippinesTime.UtcNow),
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

    private async Task<string> ResolveIssuerNameAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
            return string.Empty;

        return !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : user.Username;
    }
}
