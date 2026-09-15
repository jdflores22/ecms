using ECMS.Infrastructure.Services;

namespace ECMS.API.Middleware;

/// <summary>
/// Generates missing /uploads/thumbs/*.webp files on demand from the original upload.
/// </summary>
public class UploadThumbMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _uploadRoot;

    public UploadThumbMiddleware(RequestDelegate next, IConfiguration configuration, IHostEnvironment environment)
    {
        _next = next;
        _uploadRoot = Path.Combine(
            environment.ContentRootPath,
            configuration["FileStorage:UploadPath"] ?? "uploads");
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestPath = context.Request.Path.Value ?? string.Empty;
        if (requestPath.StartsWith("/uploads/thumbs/", StringComparison.OrdinalIgnoreCase)
            && requestPath.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
        {
            var relativePath = requestPath.Split('?')[0].Replace('\\', '/');
            var thumbAbs = UploadImageProcessor.AbsoluteThumbPath(_uploadRoot, relativePath);
            if (!File.Exists(thumbAbs))
            {
                UploadImageProcessor.TryEnsureThumbnail(_uploadRoot, relativePath);
            }
        }

        await _next(context);
    }
}
