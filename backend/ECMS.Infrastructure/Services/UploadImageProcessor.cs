using SkiaSharp;

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

            using var input = File.OpenRead(absoluteSourcePath);
            using var codec = SKCodec.Create(input);
            if (codec is null)
                return false;

            using var bitmap = SKBitmap.Decode(codec);
            if (bitmap is null)
                return false;

            using var oriented = ApplyEncodedOrigin(bitmap, codec.EncodedOrigin);
            using var toEncode = ResizeIfNeeded(oriented, ThumbMaxWidth);
            using var image = SKImage.FromBitmap(toEncode);
            using var data = image.Encode(SKEncodedImageFormat.Webp, ThumbQuality);
            if (data is null)
                return false;

            using var output = File.OpenWrite(absoluteThumbPath);
            data.SaveTo(output);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static SKBitmap ResizeIfNeeded(SKBitmap bitmap, int maxWidth)
    {
        if (bitmap.Width <= maxWidth)
            return bitmap.Copy();

        var scale = (float)maxWidth / bitmap.Width;
        var height = Math.Max(1, (int)Math.Round(bitmap.Height * scale));
        var info = new SKImageInfo(maxWidth, height, bitmap.ColorType, bitmap.AlphaType);
        var resized = bitmap.Resize(info, SKFilterQuality.Medium);
        return resized ?? bitmap.Copy();
    }

    private static SKBitmap ApplyEncodedOrigin(SKBitmap bitmap, SKEncodedOrigin origin)
    {
        if (origin is SKEncodedOrigin.TopLeft or SKEncodedOrigin.Default)
            return bitmap.Copy();

        var (swapDimensions, degrees, flipX, flipY) = origin switch
        {
            SKEncodedOrigin.TopRight => (false, 0, true, false),
            SKEncodedOrigin.BottomRight => (false, 180, false, false),
            SKEncodedOrigin.BottomLeft => (false, 0, false, true),
            SKEncodedOrigin.LeftTop => (true, 90, true, false),
            SKEncodedOrigin.RightTop => (true, 90, false, false),
            SKEncodedOrigin.RightBottom => (true, 270, true, false),
            SKEncodedOrigin.LeftBottom => (true, 270, false, false),
            _ => (false, 0, false, false),
        };

        var width = swapDimensions ? bitmap.Height : bitmap.Width;
        var height = swapDimensions ? bitmap.Width : bitmap.Height;
        var result = new SKBitmap(width, height, bitmap.ColorType, bitmap.AlphaType);

        using (var canvas = new SKCanvas(result))
        {
            canvas.Translate(width / 2f, height / 2f);
            if (degrees != 0)
                canvas.RotateDegrees(degrees);
            if (flipX || flipY)
                canvas.Scale(flipX ? -1 : 1, flipY ? -1 : 1);
            canvas.Translate(-bitmap.Width / 2f, -bitmap.Height / 2f);
            canvas.DrawBitmap(bitmap, 0, 0);
        }

        return result;
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
