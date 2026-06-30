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

    public AssetsController(IUploadUrlSigner uploadUrlSigner)
    {
        _uploadUrlSigner = uploadUrlSigner;
    }

    [HttpPost("sign")]
    public IActionResult Sign([FromBody] SignAssetRequest request)
    {
        if (!TryNormalizeUploadPath(request.Path, out var path, out var error))
            return BadRequest(new { message = error });

        var signed = _uploadUrlSigner.SignRelativePath(path, TimeSpan.FromHours(8));
        return Ok(new { path = signed });
    }

    [HttpPost("sign-batch")]
    public IActionResult SignBatch([FromBody] SignAssetBatchRequest request)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in request.Paths ?? Array.Empty<string>())
        {
            if (!TryNormalizeUploadPath(raw, out var path, out _))
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
