using ECMS.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace ECMS.Infrastructure.Services;

public class PaymentProofExtractionService : IPaymentProofExtractionService
{
    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
    };

    private readonly ILogger<PaymentProofExtractionService> _logger;

    public PaymentProofExtractionService(ILogger<PaymentProofExtractionService> logger)
    {
        _logger = logger;
    }

    public Task<(string? ReferenceNo, DateTime? TransactionAt)> ExtractFromImageAsync(
        string absoluteFilePath,
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(absoluteFilePath))
            return Task.FromResult<(string?, DateTime?)>((null, null));

        var extension = Path.GetExtension(absoluteFilePath);
        if (!ImageExtensions.Contains(extension))
            return Task.FromResult<(string?, DateTime?)>((null, null));

        try
        {
            var text = TryRunTesseract(absoluteFilePath);
            if (string.IsNullOrWhiteSpace(text))
                return Task.FromResult<(string?, DateTime?)>((null, null));

            var parsed = PaymentProofTextParser.Parse(text);
            return Task.FromResult((parsed.ReferenceNo, parsed.TransactionAt));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Payment proof OCR failed for {FilePath}", absoluteFilePath);
            return Task.FromResult<(string?, DateTime?)>((null, null));
        }
    }

    private static string? TryRunTesseract(string absoluteFilePath)
    {
        try
        {
            using var engine = CreateEngine();
            if (engine is null)
                return null;

            using var pix = Tesseract.Pix.LoadFromFile(absoluteFilePath);
            using var page = engine.Process(pix);
            return page.GetText();
        }
        catch (DllNotFoundException)
        {
            return null;
        }
        catch (TypeInitializationException)
        {
            return null;
        }
    }

    private static Tesseract.TesseractEngine? CreateEngine()
    {
        var tessDataPath = ResolveTessDataPath();
        if (tessDataPath is null)
            return null;

        return new Tesseract.TesseractEngine(tessDataPath, "eng", Tesseract.EngineMode.Default);
    }

    private static string? ResolveTessDataPath()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "tessdata"),
            "/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata",
            @"C:\Program Files\Tesseract-OCR\tessdata",
        };

        foreach (var path in candidates)
        {
            if (Directory.Exists(path) && File.Exists(Path.Combine(path, "eng.traineddata")))
                return path;
        }

        return null;
    }
}
