using System.Security.Cryptography;
using System.Text;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.ContainerReleaseOrder;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using ECMS.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class ContainerReleaseOrderService : IContainerReleaseOrderService
{
    private const string NotFoundMessage =
        "This document could not be verified. The QR code may be invalid, expired, or not issued by Intelligent Container Solutions (ICS).";
    private const string CancelledMessage =
        "This CRO/eDO has been cancelled and is no longer valid.";

    private readonly IEcmsDbContext _db;
    private readonly IAuditService _audit;
    private readonly byte[] _pepperBytes;
    private readonly string _publicFrontendUrl;

    public ContainerReleaseOrderService(
        IEcmsDbContext db,
        IAuditService audit,
        IConfiguration configuration,
        IOptions<IcsAppOptions> appOptions)
    {
        _db = db;
        _audit = audit;
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is required for CRO/eDO verification tokens.");
        _pepperBytes = Encoding.UTF8.GetBytes(key);
        _publicFrontendUrl = (appOptions.Value.PublicFrontendUrl ?? "http://localhost:5173").TrimEnd('/');
    }

    public async Task<IReadOnlyList<ContainerReleaseOrderDto>> GetAllAsync(
        int userId, string role, CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var items = await Query()
            .Where(o => o.ShippingLineId == shippingLineId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(cancellationToken);
        return items.Select(Map).ToList();
    }

    public async Task<ContainerReleaseOrderDto?> GetByIdAsync(
        int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.Id == id && o.ShippingLineId == shippingLineId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<ContainerReleaseOrderDto> CreateAsync(
        CreateContainerReleaseOrderRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var evaluator = await RequireEvaluatorAsync(userId, role, cancellationToken);
        var shippingLineId = evaluator.ShippingLineId!.Value;
        var lines = await NormalizeLinesAsync(request.Lines, cancellationToken);

        var entity = new ContainerReleaseOrder
        {
            ReferenceNo = await GenerateReferenceAsync(cancellationToken),
            ShippingLineId = shippingLineId,
            Status = ContainerReleaseOrderStatus.Draft,
            ConsigneeNotifyParty = RequireText(request.ConsigneeNotifyParty, "Consignee/Notify Party"),
            ShippingLineCarrier = string.IsNullOrWhiteSpace(request.ShippingLineCarrier)
                ? evaluator.ShippingLine!.Name
                : request.ShippingLineCarrier.Trim(),
            RegistryNumber = RequireText(request.RegistryNumber, "Registry Number"),
            CustomsOffice = RequireText(request.CustomsOffice, "Customs Office"),
            VesselVoyageNumber = RequireText(request.VesselVoyageNumber, "Vessel/Voyage Number"),
            BlNumber = RequireText(request.BlNumber, "BL Number"),
            BrokerName = RequireText(request.BrokerName, "Name of Broker"),
            PortInstructions = string.IsNullOrWhiteSpace(request.PortInstructions)
                ? new ContainerReleaseOrder().PortInstructions
                : request.PortInstructions.Trim(),
            EmptyReturnNote = string.IsNullOrWhiteSpace(request.EmptyReturnNote)
                ? new ContainerReleaseOrder().EmptyReturnNote
                : request.EmptyReturnNote.Trim(),
            AuthorizedByName = TrimOrNull(request.AuthorizedByName) ?? evaluator.FullName,
            AuthorizedByCompany = TrimOrNull(request.AuthorizedByCompany) ?? evaluator.ShippingLine!.Name,
            PreparedByName = TrimOrNull(request.PreparedByName) ?? evaluator.FullName,
            Remarks = TrimOrNull(request.Remarks),
            Lines = lines,
        };

        _db.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        await _audit.LogAsync(userId, "CRO_CREATED", "ContainerReleaseOrder",
            $"Draft CRO {entity.ReferenceNo} ({entity.BlNumber})", cancellationToken);

        return (await GetByIdAsync(entity.Id, userId, role, cancellationToken))!;
    }

    public async Task<ContainerReleaseOrderDto> UpdateAsync(
        int id,
        UpdateContainerReleaseOrderRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.Id == id && o.ShippingLineId == shippingLineId, cancellationToken)
            ?? throw new InvalidOperationException("CRO/eDO not found.");

        if (entity.Status != ContainerReleaseOrderStatus.Draft)
            throw new InvalidOperationException("Only draft CRO/eDO documents can be edited.");

        var lines = await NormalizeLinesAsync(request.Lines, cancellationToken);

        entity.ConsigneeNotifyParty = RequireText(request.ConsigneeNotifyParty, "Consignee/Notify Party");
        entity.ShippingLineCarrier = string.IsNullOrWhiteSpace(request.ShippingLineCarrier)
            ? entity.ShippingLine.Name
            : request.ShippingLineCarrier.Trim();
        entity.RegistryNumber = RequireText(request.RegistryNumber, "Registry Number");
        entity.CustomsOffice = RequireText(request.CustomsOffice, "Customs Office");
        entity.VesselVoyageNumber = RequireText(request.VesselVoyageNumber, "Vessel/Voyage Number");
        entity.BlNumber = RequireText(request.BlNumber, "BL Number");
        entity.BrokerName = RequireText(request.BrokerName, "Name of Broker");
        if (!string.IsNullOrWhiteSpace(request.PortInstructions))
            entity.PortInstructions = request.PortInstructions.Trim();
        if (!string.IsNullOrWhiteSpace(request.EmptyReturnNote))
            entity.EmptyReturnNote = request.EmptyReturnNote.Trim();
        entity.AuthorizedByName = TrimOrNull(request.AuthorizedByName);
        entity.AuthorizedByCompany = TrimOrNull(request.AuthorizedByCompany);
        entity.PreparedByName = TrimOrNull(request.PreparedByName);
        entity.Remarks = TrimOrNull(request.Remarks);

        foreach (var existing in entity.Lines.ToList())
            _db.Remove(existing);
        entity.Lines = lines;

        await _db.SaveChangesAsync(cancellationToken);
        await _audit.LogAsync(userId, "CRO_UPDATED", "ContainerReleaseOrder",
            $"Updated draft CRO {entity.ReferenceNo}", cancellationToken);

        return (await GetByIdAsync(entity.Id, userId, role, cancellationToken))!;
    }

    public async Task<ContainerReleaseOrderDto> IssueAsync(
        int id,
        int userId,
        string role,
        string? uploadRoot,
        string? logoPath,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.Id == id && o.ShippingLineId == shippingLineId, cancellationToken)
            ?? throw new InvalidOperationException("CRO/eDO not found.");

        if (entity.Status == ContainerReleaseOrderStatus.Cancelled)
            throw new InvalidOperationException("Cancelled CRO/eDO cannot be issued.");
        if (entity.Lines.Count == 0)
            throw new InvalidOperationException("Add at least one container line before issuing.");

        var issuedAt = PhilippinesTime.UtcNow;
        NormalizeEmptyReturnNote(entity);
        entity.PdfPath = await WritePdfAsync(entity, uploadRoot, logoPath, issuedAt, cancellationToken);

        entity.Status = ContainerReleaseOrderStatus.Issued;
        entity.IssuedAt = issuedAt;
        entity.IssuedByUserId = userId;

        await _db.SaveChangesAsync(cancellationToken);
        await _audit.LogAsync(userId, "CRO_ISSUED", "ContainerReleaseOrder",
            $"Issued CRO {entity.ReferenceNo}", cancellationToken);

        return (await GetByIdAsync(entity.Id, userId, role, cancellationToken))!;
    }

    public async Task<ContainerReleaseOrderDto> RegeneratePdfAsync(
        int id,
        int userId,
        string role,
        string? uploadRoot,
        string? logoPath,
        CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.Id == id && o.ShippingLineId == shippingLineId, cancellationToken)
            ?? throw new InvalidOperationException("CRO/eDO not found.");

        if (entity.Status != ContainerReleaseOrderStatus.Issued)
            throw new InvalidOperationException("Only issued CRO/eDO documents can regenerate a PDF.");
        if (entity.Lines.Count == 0)
            throw new InvalidOperationException("Add at least one container line before regenerating the PDF.");

        var issuedAt = entity.IssuedAt ?? PhilippinesTime.UtcNow;
        NormalizeEmptyReturnNote(entity);
        entity.PdfPath = await WritePdfAsync(entity, uploadRoot, logoPath, issuedAt, cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);
        await _audit.LogAsync(userId, "CRO_PDF_REGENERATED", "ContainerReleaseOrder",
            $"Regenerated PDF for CRO {entity.ReferenceNo}", cancellationToken);

        return (await GetByIdAsync(entity.Id, userId, role, cancellationToken))!;
    }

    private static readonly string LegacyEmptyReturnNote =
        "For empty container return to MICT/ATI, kindly send a PRE-ADVISE Notice. Delivered containers without pre-advise confirmation are subject to shut out fee.";

    private static void NormalizeEmptyReturnNote(ContainerReleaseOrder entity)
    {
        if (string.IsNullOrWhiteSpace(entity.EmptyReturnNote)
            || string.Equals(entity.EmptyReturnNote.Trim(), LegacyEmptyReturnNote, StringComparison.OrdinalIgnoreCase))
        {
            entity.EmptyReturnNote = new ContainerReleaseOrder().EmptyReturnNote;
        }
    }

    private async Task<string> WritePdfAsync(
        ContainerReleaseOrder entity,
        string? uploadRoot,
        string? logoPath,
        DateTime issuedAt,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(uploadRoot))
            throw new InvalidOperationException("Upload path is not configured.");

        var plainToken = AssignNewVerificationToken(entity);
        var verifyUrl = BuildVerifyUrl(plainToken);
        var qrPng = CertificateQrImageGenerator.GeneratePng(verifyUrl);
        var pdfBytes = CroEdoPdfRenderer.Render(ToPdfData(entity, logoPath, issuedAt, qrPng));
        var relativeDir = Path.Combine("cro-edo", entity.Id.ToString());
        var absoluteDir = Path.Combine(uploadRoot, relativeDir);
        Directory.CreateDirectory(absoluteDir);
        var fileName = $"CRO-{entity.ReferenceNo}.pdf";
        var absolutePath = Path.Combine(absoluteDir, fileName);

        if (!string.IsNullOrWhiteSpace(entity.PdfPath))
        {
            var previous = Path.Combine(uploadRoot, entity.PdfPath.Replace('/', Path.DirectorySeparatorChar));
            if (!string.Equals(previous, absolutePath, StringComparison.OrdinalIgnoreCase) && File.Exists(previous))
            {
                try { File.Delete(previous); } catch { /* best effort */ }
            }
        }

        await File.WriteAllBytesAsync(absolutePath, pdfBytes, cancellationToken);
        return Path.Combine(relativeDir, fileName).Replace('\\', '/');
    }

    private string AssignNewVerificationToken(ContainerReleaseOrder entity)
    {
        var plainToken = CertificateVerificationTokens.GeneratePlainToken();
        entity.VerificationTokenHash = CertificateVerificationTokens.HashToken(plainToken, _pepperBytes);
        return plainToken;
    }

    private string BuildVerifyUrl(string plainToken)
    {
        var encoded = Uri.EscapeDataString(plainToken.Trim());
        return $"{_publicFrontendUrl}/verify/cro-edo/{encoded}";
    }

    public async Task<CroEdoVerificationResponseDto> VerifyPublicAsync(
        string plainToken,
        CancellationToken cancellationToken = default)
    {
        if (!CertificateVerificationTokens.IsValidFormat(plainToken))
            return Invalid("not_found", NotFoundMessage);

        var tokenHash = CertificateVerificationTokens.HashToken(plainToken, _pepperBytes);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.VerificationTokenHash == tokenHash, cancellationToken);

        if (entity is null)
            return Invalid("not_found", NotFoundMessage);

        if (entity.Status == ContainerReleaseOrderStatus.Cancelled)
            return Invalid("cancelled", CancelledMessage);

        if (entity.Status != ContainerReleaseOrderStatus.Issued)
            return Invalid("not_found", NotFoundMessage);

        entity.VerificationCount += 1;
        entity.LastVerifiedAt = PhilippinesTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var lines = entity.Lines
            .OrderBy(l => l.LineNo)
            .Select(l => new CroEdoVerificationLineDto(
                l.LineNo,
                l.ContainerNumber,
                l.Size,
                l.Type,
                l.Seal,
                l.HaulerName,
                l.PlateNo,
                l.DemurrageValidUntil.ToString("dd-MMM-yyyy"),
                l.ReturnEmptyToName))
            .ToList();

        return new CroEdoVerificationResponseDto(
            true,
            "valid",
            "This CRO/eDO was officially issued by Intelligent Container Solutions (ICS).",
            entity.ReferenceNo,
            entity.Status.ToString(),
            entity.ShippingLineId,
            entity.ShippingLine.Name,
            entity.ConsigneeNotifyParty,
            entity.BlNumber,
            entity.VesselVoyageNumber,
            entity.BrokerName,
            entity.IssuedAt?.ToString("dd-MMM-yyyy HH:mm"),
            lines);
    }

    private static CroEdoVerificationResponseDto Invalid(string status, string message) =>
        new(false, status, message, null, null, null, null, null, null, null, null, null, null);

    public async Task<CroEdoLinkDto?> ResolveIssuedLinkAsync(
        string plainToken,
        CancellationToken cancellationToken = default)
    {
        if (!CertificateVerificationTokens.IsValidFormat(plainToken))
            return null;

        var tokenHash = CertificateVerificationTokens.HashToken(plainToken, _pepperBytes);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.VerificationTokenHash == tokenHash, cancellationToken);

        if (entity is null || entity.Status != ContainerReleaseOrderStatus.Issued)
            return null;

        return new CroEdoLinkDto(
            entity.Id,
            entity.ReferenceNo,
            entity.VerificationTokenHash!,
            entity.ShippingLineId,
            entity.ShippingLine.Name,
            entity.ShippingLineCarrier,
            entity.Lines
                .OrderBy(l => l.LineNo)
                .Select(l => new CroEdoLinkLineDto(
                    l.LineNo,
                    l.ContainerNumber,
                    l.Size,
                    l.Type,
                    l.DemurrageValidUntil.ToString("yyyy-MM-dd"),
                    l.ReturnEmptyToName))
                .ToList());
    }

    public async Task<ContainerReleaseOrderDto> CancelAsync(
        int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.Id == id && o.ShippingLineId == shippingLineId, cancellationToken)
            ?? throw new InvalidOperationException("CRO/eDO not found.");

        if (entity.Status == ContainerReleaseOrderStatus.Cancelled)
            throw new InvalidOperationException("CRO/eDO is already cancelled.");

        entity.Status = ContainerReleaseOrderStatus.Cancelled;
        await _db.SaveChangesAsync(cancellationToken);
        await _audit.LogAsync(userId, "CRO_CANCELLED", "ContainerReleaseOrder",
            $"Cancelled CRO {entity.ReferenceNo}", cancellationToken);

        return (await GetByIdAsync(entity.Id, userId, role, cancellationToken))!;
    }

    public async Task<(byte[] Bytes, string FileName)?> GetPdfAsync(
        int id, int userId, string role, string? uploadRoot, CancellationToken cancellationToken = default)
    {
        var shippingLineId = await RequireEvaluatorShippingLineAsync(userId, role, cancellationToken);
        var entity = await Query()
            .FirstOrDefaultAsync(o => o.Id == id && o.ShippingLineId == shippingLineId, cancellationToken);
        if (entity is null || string.IsNullOrWhiteSpace(entity.PdfPath) || string.IsNullOrWhiteSpace(uploadRoot))
            return null;

        var absolute = Path.Combine(uploadRoot, entity.PdfPath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(absolute))
            return null;

        var bytes = await File.ReadAllBytesAsync(absolute, cancellationToken);
        return (bytes, Path.GetFileName(absolute));
    }

    private IQueryable<ContainerReleaseOrder> Query() =>
        _db.ContainerReleaseOrders
            .Include(o => o.ShippingLine)
            .Include(o => o.IssuedBy)
            .Include(o => o.Lines)
                .ThenInclude(l => l.ReturnEmptyToDepot);

    private async Task<User> RequireEvaluatorAsync(int userId, string role, CancellationToken cancellationToken)
    {
        if (!string.Equals(RoleNames.NormalizeTransactionRole(role), RoleNames.ShippingLineEvaluator, StringComparison.Ordinal))
            throw new InvalidOperationException("Only shipping line evaluators can manage CRO/eDO.");

        var user = await _db.Users
            .Include(u => u.ShippingLine)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!user.ShippingLineId.HasValue || user.ShippingLine is null)
            throw new InvalidOperationException("Evaluator is not assigned to a shipping line.");

        return user;
    }

    private async Task<int> RequireEvaluatorShippingLineAsync(int userId, string role, CancellationToken cancellationToken)
    {
        var user = await RequireEvaluatorAsync(userId, role, cancellationToken);
        return user.ShippingLineId!.Value;
    }

    private async Task<List<ContainerReleaseOrderLine>> NormalizeLinesAsync(
        IReadOnlyList<ContainerReleaseOrderLineInput>? inputs,
        CancellationToken cancellationToken)
    {
        if (inputs is null || inputs.Count == 0)
            throw new InvalidOperationException("At least one container line is required.");

        var lines = new List<ContainerReleaseOrderLine>();
        var lineNo = 1;
        foreach (var input in inputs)
        {
            if (!DateOnly.TryParse(input.DemurrageValidUntil, out var demurrageUntil))
                throw new InvalidOperationException($"Invalid demurrage validity on line {lineNo}.");

            string returnName = (input.ReturnEmptyToName ?? string.Empty).Trim();
            int? depotId = input.ReturnEmptyToDepotId;
            if (depotId.HasValue)
            {
                var depot = await _db.Depots.FirstOrDefaultAsync(d => d.Id == depotId.Value && d.IsActive, cancellationToken)
                    ?? throw new InvalidOperationException($"Return Empty To depot not found (line {lineNo}).");
                if (string.IsNullOrWhiteSpace(returnName))
                    returnName = depot.Name;
            }

            if (string.IsNullOrWhiteSpace(returnName))
                throw new InvalidOperationException($"Return Empty To is required on line {lineNo}.");

            lines.Add(new ContainerReleaseOrderLine
            {
                LineNo = lineNo,
                ContainerNumber = RequireText(input.ContainerNumber, $"Container Number (line {lineNo})").ToUpperInvariant(),
                Size = RequireText(input.Size, $"Size (line {lineNo})"),
                Type = RequireText(input.Type, $"Type (line {lineNo})"),
                Seal = string.IsNullOrWhiteSpace(input.Seal) ? "SEALED" : input.Seal.Trim(),
                HaulerName = RequireText(input.HaulerName, $"Name of Hauler (line {lineNo})"),
                PlateNo = RequireText(input.PlateNo, $"Plate No. (line {lineNo})").ToUpperInvariant(),
                LineReferenceNo = string.IsNullOrWhiteSpace(input.LineReferenceNo)
                    ? GenerateLineRef()
                    : input.LineReferenceNo.Trim().ToUpperInvariant(),
                DemurrageValidUntil = demurrageUntil,
                ReturnEmptyToDepotId = depotId,
                ReturnEmptyToName = returnName,
            });
            lineNo++;
        }

        return lines;
    }

    private async Task<string> GenerateReferenceAsync(CancellationToken cancellationToken)
    {
        for (var i = 0; i < 8; i++)
        {
            var candidate = "CRO" + GenerateLineRef();
            var exists = await _db.ContainerReleaseOrders.AnyAsync(o => o.ReferenceNo == candidate, cancellationToken);
            if (!exists)
                return candidate;
        }

        return "CRO" + PhilippinesTime.UtcNow.ToString("yyMMddHHmmss");
    }

    private static string GenerateLineRef()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);
        var chars = new char[8];
        for (var i = 0; i < chars.Length; i++)
            chars[i] = alphabet[bytes[i] % alphabet.Length];
        return new string(chars);
    }

    private static string RequireText(string? value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"{label} is required.");
        return value.Trim();
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CroEdoPdfData ToPdfData(
        ContainerReleaseOrder entity,
        string? logoPath,
        DateTime issuedAt,
        byte[] qrPng) =>
        new()
        {
            LogoPath = logoPath,
            ReferenceNo = entity.ReferenceNo,
            Status = "ISSUED",
            ConsigneeNotifyParty = entity.ConsigneeNotifyParty,
            ShippingLineCarrier = entity.ShippingLineCarrier,
            RegistryNumber = entity.RegistryNumber,
            CustomsOffice = entity.CustomsOffice,
            VesselVoyageNumber = entity.VesselVoyageNumber,
            BlNumber = entity.BlNumber,
            BrokerName = entity.BrokerName,
            PortInstructions = entity.PortInstructions,
            EmptyReturnNote = entity.EmptyReturnNote,
            AuthorizedByName = entity.AuthorizedByName,
            AuthorizedByCompany = entity.AuthorizedByCompany,
            PreparedByName = entity.PreparedByName,
            IssuedAtDisplay = issuedAt.ToString("dd-MMM-yyyy HH:mm"),
            QrPng = qrPng,
            Lines = entity.Lines
                .OrderBy(l => l.LineNo)
                .Select(l => new CroEdoPdfLine
                {
                    LineNo = l.LineNo,
                    ContainerNumber = l.ContainerNumber,
                    Size = l.Size,
                    Type = l.Type,
                    Seal = l.Seal,
                    HaulerName = l.HaulerName,
                    PlateNo = l.PlateNo,
                    LineReferenceNo = l.LineReferenceNo,
                    DemurrageValidUntil = l.DemurrageValidUntil.ToString("dd-MMM-yyyy"),
                    ReturnEmptyTo = l.ReturnEmptyToName,
                })
                .ToList(),
        };

    private static ContainerReleaseOrderDto Map(ContainerReleaseOrder o) =>
        new(
            o.Id,
            o.ReferenceNo,
            o.ShippingLineId,
            o.ShippingLine.Name,
            o.Status.ToString(),
            o.ConsigneeNotifyParty,
            o.ShippingLineCarrier,
            o.RegistryNumber,
            o.CustomsOffice,
            o.VesselVoyageNumber,
            o.BlNumber,
            o.BrokerName,
            o.PortInstructions,
            o.EmptyReturnNote,
            o.AuthorizedByName,
            o.AuthorizedByCompany,
            o.PreparedByName,
            o.Remarks,
            o.IssuedAt?.ToString("o"),
            o.IssuedBy?.FullName,
            !string.IsNullOrWhiteSpace(o.PdfPath),
            o.CreatedAt.ToString("o"),
            o.Lines
                .OrderBy(l => l.LineNo)
                .Select(l => new ContainerReleaseOrderLineDto(
                    l.Id,
                    l.LineNo,
                    l.ContainerNumber,
                    l.Size,
                    l.Type,
                    l.Seal,
                    l.HaulerName,
                    l.PlateNo,
                    l.LineReferenceNo,
                    l.DemurrageValidUntil.ToString("yyyy-MM-dd"),
                    l.ReturnEmptyToDepotId,
                    l.ReturnEmptyToName))
                .ToList());
}
