using System.Security.Claims;
using ECMS.Application.DTOs.News;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/trucker-news")]
[Authorize]
public class TruckerNewsController : ControllerBase
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp",
    };

    private readonly ITruckerNewsService _news;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public TruckerNewsController(
        ITruckerNewsService news,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _news = news;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("feed")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<IReadOnlyList<TruckerNewsFeedItemDto>>> GetFeed(CancellationToken cancellationToken)
        => Ok(await _news.GetPublishedFeedAsync(cancellationToken));

    [HttpGet("{id:int}")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<TruckerNewsDetailDto>> GetPublished(int id, CancellationToken cancellationToken)
    {
        var item = await _news.GetPublishedByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<IReadOnlyList<TruckerNewsAdminDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _news.GetAllAsync(cancellationToken));

    [HttpPost]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<TruckerNewsAdminDto>> Create(
        [FromBody] CreateTruckerNewsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _news.CreateAsync(UserId, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<TruckerNewsAdminDto>> Update(
        int id,
        [FromBody] UpdateTruckerNewsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _news.UpdateAsync(id, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/publish")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<TruckerNewsAdminDto>> Publish(int id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _news.PublishAsync(id, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/image")]
    [Authorize(Roles = RoleNames.Administrator)]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<TruckerNewsAdminDto>> UploadImage(
        int id,
        IFormFile image,
        CancellationToken cancellationToken)
    {
        if (image is null || image.Length == 0)
            return BadRequest(new { message = "Image file is required." });

        var extension = Path.GetExtension(image.FileName);
        if (!AllowedImageExtensions.Contains(extension))
            return BadRequest(new { message = "Allowed image types: JPG, PNG, WEBP." });

        var uploadRoot = _configuration["FileStorage:UploadPath"] ?? "uploads";
        var uploadDir = Path.Combine(_env.ContentRootPath, uploadRoot, "trucker-news");
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = Path.Combine(uploadDir, storedName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await image.CopyToAsync(stream, cancellationToken);
        }

        var webPath = $"/uploads/trucker-news/{storedName}";
        try
        {
            return Ok(await _news.SetImageAsync(
                id,
                webPath,
                image.FileName,
                image.ContentType ?? "image/jpeg",
                image.Length,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            System.IO.File.Delete(fullPath);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            await _news.DeleteAsync(id, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
