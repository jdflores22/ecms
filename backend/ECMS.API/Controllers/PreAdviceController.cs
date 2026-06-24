using System.Security.Claims;
using ECMS.Application;
using ECMS.Application.DTOs.PreAdvice;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/preadvice")]
[Authorize]
public class PreAdviceController : ControllerBase
{
    private readonly IPreAdviceService _service;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp",
    };

    public PreAdviceController(
        IPreAdviceService service,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _service = service;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PreAdviceDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, Role, cancellationToken));

    [HttpGet("lookups")]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<ActionResult<PreAdviceLookupsDto>> Lookups(CancellationToken cancellationToken)
        => Ok(await _service.GetLookupsAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PreAdviceDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<ActionResult<PreAdviceDto>> Create([FromBody] CreatePreAdviceRequest request, CancellationToken cancellationToken)
        => Ok(await _service.CreateAsync(request, UserId, cancellationToken));

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<ActionResult<PreAdviceDto>> Update(int id, [FromBody] UpdatePreAdviceRequest request, CancellationToken cancellationToken)
    {
        var item = await _service.UpdateAsync(id, request, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, UserId, Role, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:int}/submit")]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<ActionResult<PreAdviceDto>> Submit(int id, CancellationToken cancellationToken)
    {
        var item = await _service.SubmitAsync(id, UserId, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<ActionResult<PreAdviceDto>> Cancel(
        int id,
        [FromBody] CancelPreAdviceRequest? request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.CancelAsync(id, UserId, Role, request?.Reason, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/documents")]
    public async Task<ActionResult<IReadOnlyList<PreAdviceDocumentDto>>> GetDocuments(int id, CancellationToken cancellationToken)
    {
        var documents = await _service.GetDocumentsAsync(id, UserId, Role, cancellationToken);
        if (documents.Count == 0 && await _service.GetByIdAsync(id, UserId, Role, cancellationToken) is null)
            return NotFound();

        return Ok(documents);
    }

    [HttpPost("{id:int}/documents")]
    [Authorize(Roles = RoleNames.Broker)]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<PreAdviceDocumentDto>> UploadDocument(
        int id,
        IFormFile file,
        [FromForm] string category,
        [FromForm] string? comment,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Image file is required." });

        if (!ContainerPhotoCatalog.TryParse(category, out var photoCategory))
            return BadRequest(new { message = "Photo category is required." });

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            return BadRequest(new { message = "Only image files are allowed (JPG, PNG, WEBP)." });

        var uploadDir = Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadDir, storedName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream, cancellationToken);

        try
        {
            var document = await _service.UploadDocumentAsync(
                id,
                UserId,
                Role,
                photoCategory,
                comment,
                file.FileName,
                $"/uploads/{storedName}",
                file.ContentType,
                file.Length,
                cancellationToken);

            return document is null ? NotFound() : Ok(document);
        }
        catch (InvalidOperationException ex)
        {
            System.IO.File.Delete(filePath);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}/documents/{documentId:int}")]
    [Authorize(Roles = RoleNames.Broker)]
    public async Task<IActionResult> DeleteDocument(int id, int documentId, CancellationToken cancellationToken)
    {
        var document = await _service.GetDocumentsAsync(id, UserId, Role, cancellationToken);
        var target = document.FirstOrDefault(d => d.Id == documentId);
        if (target is null)
            return NotFound();

        var deleted = await _service.DeleteDocumentAsync(id, documentId, UserId, Role, cancellationToken);
        if (!deleted)
            return NotFound();

        var physicalPath = Path.Combine(
            _env.ContentRootPath,
            (_configuration["FileStorage:UploadPath"] ?? "uploads"),
            Path.GetFileName(target.FilePath));

        if (System.IO.File.Exists(physicalPath))
            System.IO.File.Delete(physicalPath);

        return NoContent();
    }
}
