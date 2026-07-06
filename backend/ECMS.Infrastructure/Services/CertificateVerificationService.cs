using System.Security.Cryptography;
using System.Text;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.Certificate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using ECMS.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class CertificateVerificationService : ICertificateVerificationService
{
    private const string NotFoundMessage = "This document could not be verified. The QR code may be invalid, expired, or not issued by Intelligent Container Solutions (ICS).";
    private const string RevokedMessage = "This certificate has been revoked and is no longer valid.";

    private readonly IEcmsDbContext _db;
    private readonly byte[] _pepperBytes;
    private readonly string _publicFrontendUrl;

    public CertificateVerificationService(
        IEcmsDbContext db,
        IConfiguration configuration,
        IOptions<IcsAppOptions> appOptions)
    {
        _db = db;
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is required for certificate verification tokens.");
        _pepperBytes = Encoding.UTF8.GetBytes(key);
        _publicFrontendUrl = (appOptions.Value.PublicFrontendUrl ?? "http://localhost:5173").TrimEnd('/');
    }

    public string GeneratePlainToken() => CertificateVerificationTokens.GeneratePlainToken();

    public string BuildVerifyUrl(string plainToken)
    {
        var encoded = Uri.EscapeDataString(plainToken.Trim());
        return $"{_publicFrontendUrl}/verify/certificate/{encoded}";
    }

    public string ComputeDocumentFingerprint(byte[] pdfBytes)
        => Convert.ToHexString(SHA256.HashData(pdfBytes));

    public async Task RegisterAsync(
        string plainToken,
        int withdrawalRequestId,
        int withdrawalDocumentId,
        CertificateDocumentType documentType,
        string documentFingerprint,
        CertificateVerificationRegistration details,
        CancellationToken cancellationToken = default)
    {
        if (!CertificateVerificationTokens.IsValidFormat(plainToken))
            throw new ArgumentException("Invalid verification token format.", nameof(plainToken));

        var tokenHash = CertificateVerificationTokens.HashToken(plainToken, _pepperBytes);
        var record = new CertificateVerification
        {
            TokenHash = tokenHash,
            WithdrawalRequestId = withdrawalRequestId,
            WithdrawalDocumentId = withdrawalDocumentId,
            DocumentType = documentType,
            DocumentFingerprint = documentFingerprint,
            AtwNumber = details.AtwNumber,
            ReferenceNo = details.ReferenceNo,
            ShippingLineName = details.ShippingLineName,
            TruckerName = details.TruckerName,
            DepotName = details.DepotName,
            ContainerNo = details.ContainerNo,
            ContainerSize = details.ContainerSize,
            ContainerType = details.ContainerType,
            Destination = details.Destination,
            WithdrawalRequestLineId = details.WithdrawalRequestLineId,
            IssuedAtUtc = PhilippinesTime.UtcNow,
        };

        _db.Add(record);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeByDocumentIdsAsync(
        IEnumerable<int> withdrawalDocumentIds,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var ids = withdrawalDocumentIds.Distinct().ToList();
        if (ids.Count == 0)
            return;

        var now = PhilippinesTime.UtcNow;
        var records = await _db.CertificateVerifications
            .Where(v => ids.Contains(v.WithdrawalDocumentId) && v.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var record in records)
        {
            record.RevokedAtUtc = now;
            record.RevocationReason = reason;
        }

        if (records.Count > 0)
            await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<CertificateVerificationResponseDto> VerifyPublicAsync(
        string plainToken,
        CancellationToken cancellationToken = default)
    {
        if (!CertificateVerificationTokens.IsValidFormat(plainToken))
            return Invalid("not_found", NotFoundMessage);

        var tokenHash = CertificateVerificationTokens.HashToken(plainToken, _pepperBytes);
        var record = await _db.CertificateVerifications
            .AsNoTracking()
            .Include(v => v.WithdrawalRequest)
                .ThenInclude(w => w.Trucker)
            .Include(v => v.WithdrawalRequest)
                .ThenInclude(w => w.CurrentDepot)
            .Include(v => v.WithdrawalRequest)
                .ThenInclude(w => w.Lines)
                    .ThenInclude(l => l.ContainerSize)
            .Include(v => v.WithdrawalRequest)
                .ThenInclude(w => w.Lines)
                    .ThenInclude(l => l.ContainerType)
            .Include(v => v.WithdrawalDocument)
            .FirstOrDefaultAsync(v => v.TokenHash == tokenHash, cancellationToken);

        if (record is null)
            return Invalid("not_found", NotFoundMessage);

        if (record.RevokedAtUtc is not null)
            return Invalid("revoked", RevokedMessage);

        await RecordSuccessfulVerificationAsync(tokenHash, cancellationToken);

        var truckerName = ResolveTruckerName(record);
        var depotName = ResolveDepotName(record);
        var container = ResolveContainerDetails(record);

        return new CertificateVerificationResponseDto(
            Valid: true,
            Status: "valid",
            Message: "This is a genuine Intelligent Container Solutions (ICS) system-generated certificate.",
            DocumentTypeLabel: FormatDocumentType(record.DocumentType),
            AtwNumber: record.AtwNumber,
            ReferenceNo: record.ReferenceNo,
            ShippingLineName: record.ShippingLineName,
            DepotName: depotName,
            TruckerName: truckerName,
            ContainerNo: container.ContainerNo,
            ContainerSize: container.ContainerSize,
            ContainerType: container.ContainerType,
            Destination: container.Destination,
            IssuedAt: FormatIssuedAt(record.IssuedAtUtc),
            IntegritySealed: !string.IsNullOrWhiteSpace(record.DocumentFingerprint));
    }

    private async Task RecordSuccessfulVerificationAsync(string tokenHash, CancellationToken cancellationToken)
    {
        var tracked = await _db.CertificateVerifications
            .FirstOrDefaultAsync(v => v.TokenHash == tokenHash, cancellationToken);

        if (tracked is null)
            return;

        tracked.VerificationCount += 1;
        tracked.LastVerifiedAtUtc = PhilippinesTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static CertificateVerificationResponseDto Invalid(string status, string message)
        => new(false, status, message, null, null, null, null, null, null, null, null, null, null, null, false);

    private static string? ResolveTruckerName(CertificateVerification record)
    {
        if (!string.IsNullOrWhiteSpace(record.TruckerName))
            return record.TruckerName;

        var trucker = record.WithdrawalRequest?.Trucker;
        if (trucker is null)
            return null;

        return !string.IsNullOrWhiteSpace(trucker.FullName) ? trucker.FullName : trucker.Username;
    }

    private static string? ResolveDepotName(CertificateVerification record)
    {
        if (!string.IsNullOrWhiteSpace(record.DepotName))
            return record.DepotName;

        return record.WithdrawalRequest?.CurrentDepot?.Name;
    }

    private static ContainerVerificationDetails ResolveContainerDetails(CertificateVerification record)
    {
        if (!string.IsNullOrWhiteSpace(record.ContainerNo)
            || !string.IsNullOrWhiteSpace(record.ContainerSize)
            || !string.IsNullOrWhiteSpace(record.ContainerType)
            || !string.IsNullOrWhiteSpace(record.Destination))
        {
            return new ContainerVerificationDetails(
                NullIfEmpty(record.ContainerNo),
                NullIfEmpty(record.ContainerSize),
                NullIfEmpty(record.ContainerType),
                NullIfEmpty(record.Destination));
        }

        if (record.DocumentType != CertificateDocumentType.CyContainerRelease)
            return ContainerVerificationDetails.Empty;

        var line = record.WithdrawalRequestLineId is int lineId
            ? record.WithdrawalRequest?.Lines.FirstOrDefault(l => l.Id == lineId)
            : null;

        if (line is null)
        {
            var containerNo = TryParseContainerNoFromFileName(record.WithdrawalDocument?.FileName, record.AtwNumber);
            if (!string.IsNullOrWhiteSpace(containerNo))
            {
                line = record.WithdrawalRequest?.Lines.FirstOrDefault(l =>
                    string.Equals(l.ContainerNoNormalized, containerNo, StringComparison.OrdinalIgnoreCase));
            }
        }

        if (line is null)
            return ContainerVerificationDetails.Empty;

        return new ContainerVerificationDetails(
            line.ContainerNoNormalized,
            StripFootMark(line.ContainerSize.Label),
            line.ContainerType.Code,
            NullIfEmpty(record.Destination) ?? NullIfEmpty(record.WithdrawalRequest?.Destination));
    }

    private static string? TryParseContainerNoFromFileName(string? fileName, string atwNumber)
    {
        if (string.IsNullOrWhiteSpace(fileName) || string.IsNullOrWhiteSpace(atwNumber))
            return null;

        const string prefix = "CY-RELEASE-";
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        if (!baseName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return null;

        var suffix = $"-{atwNumber}";
        if (!baseName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            return null;

        var container = baseName[prefix.Length..^suffix.Length];
        return string.IsNullOrWhiteSpace(container) ? null : container;
    }

    private static string? NullIfEmpty(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value;

    private static string StripFootMark(string label)
        => label.Trim().TrimEnd('\'');

    private sealed record ContainerVerificationDetails(
        string? ContainerNo,
        string? ContainerSize,
        string? ContainerType,
        string? Destination)
    {
        public static ContainerVerificationDetails Empty { get; } = new(null, null, null, null);
    }

    private static string FormatDocumentType(CertificateDocumentType documentType)
        => documentType switch
        {
            CertificateDocumentType.Atw => "Authority to Withdraw",
            CertificateDocumentType.AtwRelease => "ATW Release Certificate",
            CertificateDocumentType.CyContainerRelease => "CY Container Release",
            _ => "ICS Certificate",
        };

    private static string FormatIssuedAt(DateTime issuedAtUtc)
    {
        var normalized = issuedAtUtc.Kind == DateTimeKind.Utc
            ? issuedAtUtc
            : DateTime.SpecifyKind(issuedAtUtc, DateTimeKind.Utc);
        var local = TimeZoneInfo.ConvertTimeFromUtc(normalized, PhilippinesTime.Zone);
        return local.ToString("MMMM d, yyyy h:mm tt") + " (PH)";
    }
}
