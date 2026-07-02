namespace ECMS.Infrastructure.Options;

public sealed class OcrEnsembleOptions
{
    public const string SectionName = "OcrEnsemble";

    public bool Enabled { get; set; } = true;

    public string PythonPath { get; set; } = "python";

    /// <summary>Relative to repository root, or absolute path.</summary>
    public string ScriptRelativePath { get; set; } = "scripts/ocr-ensemble/run_ensemble.py";

    public int TimeoutSeconds { get; set; } = 120;
}
