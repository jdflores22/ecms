using System.Diagnostics;
using System.Text.Json;
using ECMS.Infrastructure.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public sealed record OcrEnsemblePass(string Engine, string Text, int Weight, string Variant);

public sealed class PythonOcrEnsembleClient
{
    private readonly OcrEnsembleOptions _options;
    private readonly ILogger<PythonOcrEnsembleClient> _logger;

    public PythonOcrEnsembleClient(IOptions<OcrEnsembleOptions> options, ILogger<PythonOcrEnsembleClient> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<OcrEnsemblePass>> RunAsync(string absoluteFilePath, CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
            return Array.Empty<OcrEnsemblePass>();

        var scriptPath = ResolveScriptPath();
        if (scriptPath is null)
        {
            _logger.LogDebug("OCR ensemble script not found");
            return Array.Empty<OcrEnsemblePass>();
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = _options.PythonPath,
                Arguments = $"\"{scriptPath}\" \"{absoluteFilePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = Process.Start(psi);
            if (process is null)
                return Array.Empty<OcrEnsemblePass>();

            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(Math.Max(30, _options.TimeoutSeconds)));

            try
            {
                await process.WaitForExitAsync(timeoutCts.Token);
            }
            catch (OperationCanceledException)
            {
                try { process.Kill(entireProcessTree: true); } catch { /* ignore */ }
                _logger.LogWarning("Python OCR ensemble timed out for {FilePath}", absoluteFilePath);
                return Array.Empty<OcrEnsemblePass>();
            }

            var stderr = await stderrTask;
            if (!string.IsNullOrWhiteSpace(stderr))
                _logger.LogDebug("OCR ensemble stderr: {Stderr}", stderr.Trim());

            if (process.ExitCode != 0)
            {
                _logger.LogWarning("Python OCR ensemble exit {ExitCode} for {FilePath}", process.ExitCode, absoluteFilePath);
                return Array.Empty<OcrEnsemblePass>();
            }

            var stdout = await stdoutTask;
            return ParsePasses(stdout);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Python OCR ensemble unavailable for {FilePath}", absoluteFilePath);
            return Array.Empty<OcrEnsemblePass>();
        }
    }

    private string? ResolveScriptPath()
    {
        if (Path.IsPathRooted(_options.ScriptRelativePath) && File.Exists(_options.ScriptRelativePath))
            return _options.ScriptRelativePath;

        var candidates = new[]
        {
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, _options.ScriptRelativePath)),
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", _options.ScriptRelativePath)),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), _options.ScriptRelativePath)),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", _options.ScriptRelativePath)),
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private static IReadOnlyList<OcrEnsemblePass> ParsePasses(string stdout)
    {
        if (string.IsNullOrWhiteSpace(stdout))
            return Array.Empty<OcrEnsemblePass>();

        using var doc = JsonDocument.Parse(stdout);
        if (!doc.RootElement.TryGetProperty("passes", out var passesEl) || passesEl.ValueKind != JsonValueKind.Array)
            return Array.Empty<OcrEnsemblePass>();

        var passes = new List<OcrEnsemblePass>();
        foreach (var item in passesEl.EnumerateArray())
        {
            var engine = item.TryGetProperty("engine", out var engineEl) ? engineEl.GetString() : null;
            var text = item.TryGetProperty("text", out var textEl) ? textEl.GetString() : null;
            var weight = item.TryGetProperty("weight", out var weightEl) && weightEl.TryGetInt32(out var w) ? w : 10;
            var variant = item.TryGetProperty("variant", out var variantEl) ? variantEl.GetString() ?? "full" : "full";
            if (string.IsNullOrWhiteSpace(engine) || string.IsNullOrWhiteSpace(text))
                continue;
            passes.Add(new OcrEnsemblePass(engine, text.Trim(), weight, variant));
        }

        return passes;
    }
}
