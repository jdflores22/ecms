using System.Security.Claims;
using ECMS.Application.Interfaces;
using ECMS.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/assets")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly IUploadUrlSigner _uploadUrlSigner;
    private readonly IUploadAccessService _uploadAccess;

    public AssetsController(IUploadUrlSigner uploadUrlSigner, IUploadAccessService uploadAccess)
    {
        _uploadUrlSigner = uploadUrlSigner;
        _uploadAccess = uploadAccess;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string Role =>
        User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;

    [HttpPost("sign")]
    public async Task<IActionResult> Sign([FromBody] SignAssetRequest request, CancellationToken cancellationToken)
    {
        if (!TryNormalizeUploadPath(request.Path, out var path, out var error))
            return BadRequest(new { message = error });

        if (!await _uploadAccess.CanAccessPathAsync(path, UserId, Role, cancellationToken))
            return NotFound();

        var signed = _uploadUrlSigner.SignRelativePath(path, TimeSpan.FromHours(8));
        return Ok(new { path = signed });
    }

    [HttpPost("sign-batch")]
    public async Task<IActionResult> SignBatch([FromBody] SignAssetBatchRequest request, CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in request.Paths ?? Array.Empty<string>())
        {
            if (!TryNormalizeUploadPath(raw, out var path, out _))
                continue;

            if (!await _uploadAccess.CanAccessPathAsync(path, UserId, Role, cancellationToken))
                continue;

            result[path] = _uploadUrlSigner.SignRelativePath(path, TimeSpan.FromHours(8));
        }

        return Ok(new { paths = result });
    }

    private static bool TryNormalizeUploadPath(string? raw, out string path, out string error)
    {
        path = string.Empty;
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(raw))
        {
            error = "Path is required.";
            return false;
        }

        path = raw.Trim();
        if (!path.StartsWith('/'))
            path = $"/{path}";

        if (!path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            error = "Only /uploads/ paths can be signed.";
            return false;
        }

        return true;
    }
}

public record SignAssetRequest(string Path);
public record SignAssetBatchRequest(IReadOnlyList<string>? Paths);
