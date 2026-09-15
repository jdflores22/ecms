using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace ECMS.Infrastructure.Services;

public static class UploadImageProcessor
{
    private const int ThumbMaxWidth = 480;
    private const int ThumbQuality = 78;

    public static string ThumbRelativePath(string uploadRelativePath)
    {
        var fileName = Path.GetFileName(uploadRelativePath.Split('?')[0]);
        var stem = Path.GetFileNameWithoutExtension(fileName);
        return $"/uploads/thumbs/{stem}.webp";
    }

    public static string AbsoluteThumbPath(string uploadRoot, string thumbRelativePath)
    {
        var fileName = Path.GetFileName(thumbRelativePath.Split('?')[0]);
        return Path.Combine(uploadRoot, "thumbs", fileName);
    }

    public static string? ResolveOriginalAbsolutePath(string uploadRoot, string uploadRelativePath)
    {
        var fileName = Path.GetFileName(uploadRelativePath.Split('?')[0]);
        if (string.IsNullOrWhiteSpace(fileName))
            return null;

        var direct = Path.Combine(uploadRoot, fileName);
        if (File.Exists(direct))
            return direct;

        var stem = Path.GetFileNameWithoutExtension(fileName);
        if (string.IsNullOrWhiteSpace(stem))
            return null;

        foreach (var match in Directory.EnumerateFiles(uploadRoot, $"{stem}.*", SearchOption.TopDirectoryOnly))
        {
            if (File.Exists(match))
                return match;
        }

        return null;
    }

    public static bool CanGenerateThumbnail(string uploadRoot, string uploadRelativePath)
    {
        var original = ResolveOriginalAbsolutePath(uploadRoot, uploadRelativePath);
        if (original is null)
            return false;

        var contentType = GuessContentType(original);
        return contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
            && !contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase);
    }

    public static bool TryEnsureThumbnail(string uploadRoot, string thumbRelativePath, string? uploadRelativePath = null)
    {
        var thumbAbs = AbsoluteThumbPath(uploadRoot, thumbRelativePath);
        if (File.Exists(thumbAbs))
            return true;

        var originalAbs = uploadRelativePath is not null
            ? ResolveOriginalAbsolutePath(uploadRoot, uploadRelativePath)
            : null;

        if (originalAbs is null)
        {
            var stem = Path.GetFileNameWithoutExtension(thumbRelativePath);
            foreach (var match in Directory.EnumerateFiles(uploadRoot, $"{stem}.*", SearchOption.TopDirectoryOnly))
            {
                originalAbs = match;
                break;
            }
        }

        if (originalAbs is null)
            return false;

        return TryCreateThumbnail(originalAbs, thumbAbs);
    }

    public static bool TryCreateThumbnail(string absoluteSourcePath, string absoluteThumbPath)
    {
        if (!File.Exists(absoluteSourcePath))
            return false;

        var contentType = GuessContentType(absoluteSourcePath);
        if (!contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
            || contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        try
        {
            var thumbDir = Path.GetDirectoryName(absoluteThumbPath);
            if (!string.IsNullOrEmpty(thumbDir))
                Directory.CreateDirectory(thumbDir);

            using var image = Image.Load(absoluteSourcePath);
            if (image.Width <= ThumbMaxWidth)
            {
                image.Mutate(x => x.AutoOrient());
                image.Save(absoluteThumbPath, new WebpEncoder { Quality = ThumbQuality });
                return true;
            }

            image.Mutate(x =>
            {
                x.AutoOrient();
                x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(ThumbMaxWidth, 0),
                });
            });
            image.Save(absoluteThumbPath, new WebpEncoder { Quality = ThumbQuality });
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string GuessContentType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            _ => "application/octet-stream",
        };
    }
}
