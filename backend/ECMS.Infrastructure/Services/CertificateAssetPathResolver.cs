namespace ECMS.Infrastructure.Services;

internal static class CertificateAssetPathResolver
{
    public static string? ResolveUploadPhysicalPath(string? contentRootPath, string webPath)
    {
        if (string.IsNullOrWhiteSpace(contentRootPath) || string.IsNullOrWhiteSpace(webPath))
            return null;

        var normalized = webPath.Replace('\\', '/').Trim();
        if (!normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
            return null;

        var relative = normalized.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(contentRootPath, relative);
    }
}
