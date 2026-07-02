namespace ECMS.Application.Configuration;

public class LogicteckOptions
{
    public const string SectionName = "Logicteck";

    /// <summary>When set, LOGICTECK endpoints require X-Logicteck-Api-Key header.</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Public ICS API base URL embedded in new QR payloads (e.g. https://api.example.com).</summary>
    public string PublicApiBaseUrl { get; set; } = "http://localhost:5275";

    /// <summary>Optional LOGICTECK inbound booking URL — ICS POSTs booking details when trucker clicks Book LOGICTECK.</summary>
    public string BookUrl { get; set; } = string.Empty;

    /// <summary>Optional LOGICTECK portal URL opened after a successful book action.</summary>
    public string PortalUrl { get; set; } = string.Empty;

    /// <summary>LOGICTECK empty return booking URL — ICS POSTs full return form payload.</summary>
    public string EmptyReturnUrl { get; set; } = string.Empty;

    /// <summary>
    /// When true, ICS POSTs transfer data to BookUrl as soon as the transfer QR is published.
    /// Default false — payment approval only publishes the QR; use BookLogicteck (Send to LOGICTECK) explicitly.
    /// </summary>
    public bool AutoTransferOnQrPublish { get; set; } = false;
}
