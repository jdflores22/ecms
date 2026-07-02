using System.Diagnostics;
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

    public Task<(string? ReferenceNo, string? QrphInvoiceNo, DateTime? TransactionAt, string? Provider)> ExtractFromImageAsync(
        string absoluteFilePath,
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(absoluteFilePath))
        {
            _logger.LogWarning("Payment proof file not found: {FilePath}", absoluteFilePath);
            return Task.FromResult<(string?, string?, DateTime?, string?)>((null, null, null, null));
        }

        var extension = Path.GetExtension(absoluteFilePath);
        if (!ImageExtensions.Contains(extension))
            return Task.FromResult<(string?, string?, DateTime?, string?)>((null, null, null, null));

        try
        {
            var text = ExtractText(absoluteFilePath);
            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Payment proof OCR returned no text for {FilePath}", absoluteFilePath);
                return Task.FromResult<(string?, string?, DateTime?, string?)>((null, null, null, null));
            }

            var parsed = PaymentProofTextParser.Parse(text);
            if (parsed.ReferenceNo is null && parsed.QrphInvoiceNo is null && parsed.TransactionAt is null && parsed.Provider is null)
                _logger.LogInformation("Payment proof OCR text had no parseable metadata for {FilePath}", absoluteFilePath);

            return Task.FromResult((parsed.ReferenceNo, parsed.QrphInvoiceNo, parsed.TransactionAt, parsed.Provider));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Payment proof OCR failed for {FilePath}", absoluteFilePath);
            return Task.FromResult<(string?, string?, DateTime?, string?)>((null, null, null, null));
        }
    }

    private string? ExtractText(string absoluteFilePath)
    {
        var text = TryRunTesseractNet(absoluteFilePath);
        if (!string.IsNullOrWhiteSpace(text))
            return text;

        text = TryRunTesseractCli(absoluteFilePath);
        if (!string.IsNullOrWhiteSpace(text))
            return text;

        return null;
    }

    private static string? TryRunTesseractNet(string absoluteFilePath)
    {
        try
        {
            using var engine = CreateNetEngine();
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
        catch (Exception)
        {
            return null;
        }
    }

    private string? TryRunTesseractCli(string absoluteFilePath)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "tesseract",
                Arguments = $"\"{absoluteFilePath}\" stdout -l eng --psm 6",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = Process.Start(psi);
            if (process is null)
                return null;

            var output = process.StandardOutput.ReadToEnd();
            if (!process.WaitForExit(60_000))
            {
                try { process.Kill(entireProcessTree: true); } catch { /* ignore */ }
                _logger.LogWarning("tesseract CLI timed out for {FilePath}", absoluteFilePath);
                return null;
            }

            if (process.ExitCode != 0)
            {
                var err = process.StandardError.ReadToEnd();
                _logger.LogWarning(
                    "tesseract CLI exit {ExitCode} for {FilePath}: {Error}",
                    process.ExitCode,
                    absoluteFilePath,
                    err.Trim());
                return null;
            }

            return output;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "tesseract CLI unavailable for {FilePath}", absoluteFilePath);
            return null;
        }
    }

    private static Tesseract.TesseractEngine? CreateNetEngine()
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
            "/usr/share/tesseract-ocr/tessdata",
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
