namespace ECMS.Application.Configuration;

public class IcsAppOptions
{
    public const string SectionName = "App";

    /// <summary>Public frontend origin used in certificate verification QR URLs (no trailing slash).</summary>
    public string PublicFrontendUrl { get; set; } = "http://localhost:5173";
}
