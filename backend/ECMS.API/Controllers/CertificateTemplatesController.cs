using System.Security.Claims;
using ECMS.Application.DTOs.Certificate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/certificate-templates")]
[Authorize(Roles = RoleNames.Administrator)]
public class CertificateTemplatesController : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
    };

    private readonly ICertificateTemplateService _templates;
    private readonly ICertificateGenerationService _generation;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public CertificateTemplatesController(
        ICertificateTemplateService templates,
        ICertificateGenerationService generation,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _templates = templates;
        _generation = generation;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CertificateTemplateDto>>> GetAll(
        [FromQuery] int? shippingLineId,
        [FromQuery] CertificateDocumentType? documentType,
        CancellationToken cancellationToken)
        => Ok(await _templates.GetAllAsync(shippingLineId, documentType, cancellationToken));

    [HttpGet("fields/{documentType}")]
    public ActionResult<IReadOnlyList<CertificateMergeFieldDto>> GetFields(CertificateDocumentType documentType)
        => Ok(_templates.GetMergeFields(documentType));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CertificateTemplateDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _templates.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<CertificateTemplateDto>> Create(
        [FromBody] CreateCertificateTemplateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _templates.CreateAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CertificateTemplateDto>> Update(
        int id,
        [FromBody] UpdateCertificateTemplateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _templates.UpdateAsync(id, request, UserId, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/activate")]
    public async Task<IActionResult> Activate(int id, CancellationToken cancellationToken)
    {
        var ok = await _templates.ActivateAsync(id, UserId, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:int}/preview")]
    public async Task<IActionResult> Preview(int id, CancellationToken cancellationToken)
    {
        var template = await _templates.GetByIdAsync(id, cancellationToken);
        if (template is null)
            return NotFound();

        var bytes = _generation.RenderPreview(template.DocumentType, template.LayoutJson);
        return File(bytes, "application/pdf", $"preview-{template.Name}.pdf");
    }

    [HttpPost("{id:int}/upload-image")]
    [RequestSizeLimit(5_242_880)]
    public async Task<ActionResult<CertificateTemplateImageUploadDto>> UploadImage(
        int id,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var template = await _templates.GetByIdAsync(id, cancellationToken);
        if (template is null)
            return NotFound();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Image file is required." });

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedImageExtensions.Contains(extension))
            return BadRequest(new { message = "Allowed images: JPG, PNG, WEBP, GIF." });

        var uploadRoot = _configuration["FileStorage:UploadPath"] ?? "uploads";
        var uploadDir = Path.Combine(_env.ContentRootPath, uploadRoot, "certificate-templates");
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var physicalPath = Path.Combine(uploadDir, storedName);

        await using (var stream = System.IO.File.Create(physicalPath))
            await file.CopyToAsync(stream, cancellationToken);

        var webPath = $"/uploads/certificate-templates/{storedName}";
        return Ok(new CertificateTemplateImageUploadDto(webPath, file.FileName));
    }

    [HttpPost("preview-layout")]
    public IActionResult PreviewLayout([FromBody] PreviewCertificateLayoutRequest request)
    {
        try
        {
            var bytes = _generation.RenderPreview(request.DocumentType, request.LayoutJson);
            return File(bytes, "application/pdf", "preview.pdf");
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public record PreviewCertificateLayoutRequest(string LayoutJson, CertificateDocumentType DocumentType = CertificateDocumentType.Atw);
