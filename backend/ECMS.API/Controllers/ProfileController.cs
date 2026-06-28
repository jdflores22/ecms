using System.Security.Claims;
using ECMS.Application.DTOs.User;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private static readonly HashSet<string> AllowedPhotoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif",
    };

    private const long MaxPhotoBytes = 5 * 1024 * 1024;

    private readonly IProfileService _service;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public ProfileController(IProfileService service, IWebHostEnvironment env, IConfiguration configuration)
    {
        _service = service;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string UploadDirectory =>
        Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get(CancellationToken cancellationToken)
    {
        var profile = await _service.GetAsync(UserId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<ActionResult<ProfileDto>> Update(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var profile = await _service.UpdateAsync(UserId, request, cancellationToken);
            return profile is null ? NotFound() : Ok(profile);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("photo")]
    [RequestSizeLimit(MaxPhotoBytes)]
    public async Task<ActionResult<ProfileDto>> UploadPhoto(IFormFile photo, CancellationToken cancellationToken)
    {
        if (photo is null || photo.Length == 0)
            return BadRequest(new { message = "Photo file is required." });

        if (photo.Length > MaxPhotoBytes)
            return BadRequest(new { message = "Photo must be 5 MB or smaller." });

        var extension = Path.GetExtension(photo.FileName);
        if (!AllowedPhotoExtensions.Contains(extension))
            return BadRequest(new { message = "Photo must be JPG, PNG, WEBP, or GIF." });

        Directory.CreateDirectory(UploadDirectory);

        var fileName = $"{Guid.NewGuid()}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(UploadDirectory, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await photo.CopyToAsync(stream, cancellationToken);

        var relativePath = $"/uploads/{fileName}";
        var profile = await _service.UploadPhotoAsync(UserId, relativePath, _env.ContentRootPath, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpDelete("photo")]
    public async Task<ActionResult<ProfileDto>> RemovePhoto(CancellationToken cancellationToken)
    {
        var profile = await _service.RemovePhotoAsync(UserId, _env.ContentRootPath, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _service.ChangePasswordAsync(UserId, request, cancellationToken);
            return Ok(new { message = "Password updated successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
