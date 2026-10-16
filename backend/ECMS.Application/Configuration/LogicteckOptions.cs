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

    /// <summary>
    /// LOGICTECK empty-return UI where truckers confirm the booking (e.g. …/dashboard/bookings/new-return).
    /// ICS opens this with <see cref="IcsRefQueryParam"/> — confirmation happens on LOGICTECK, not in ICS.
    /// </summary>
    public string NewReturnUrl { get; set; } = string.Empty;

    /// <summary>Query parameter on <see cref="NewReturnUrl"/> carrying the ICS transfer reference (QR code).</summary>
    public string IcsRefQueryParam { get; set; } = "icsRef";

    /// <summary>LOGICTECK empty return booking URL — ICS POSTs full return form payload.</summary>
    public string EmptyReturnUrl { get; set; } = string.Empty;

    /// <summary>Trucker handoff page — NewReturnUrl, then PortalUrl if unset.</summary>
    public string ResolveNewReturnUrl()
    {
        if (!string.IsNullOrWhiteSpace(NewReturnUrl))
            return NewReturnUrl.Trim();

        if (!string.IsNullOrWhiteSpace(PortalUrl))
            return PortalUrl.Trim();

        return string.Empty;
    }

    /// <summary>
    /// LOGICTECK ICS API base (no trailing slash), e.g. https://host.example/app/api/ics.
    /// When set, missing per-feed URLs default to {base}/allocations, /bookings, and /inventory.
    /// </summary>
    public string IcsApiBaseUrl { get; set; } = string.Empty;

    /// <summary>LOGICTECK CY allocation feed. ICS calls with <see cref="IcsInboundApiKey"/>.</summary>
    public string AllocationsUrl { get; set; } = string.Empty;

    /// <summary>LOGICTECK return bookings feed (GET, paginated).</summary>
    public string BookingsUrl { get; set; } = string.Empty;

    /// <summary>LOGICTECK yard inventory feed (GET, paginated).</summary>
    public string InventoryUrl { get; set; } = string.Empty;

    /// <summary>Sent as X-ICS-Api-Key on ICS inbound feeds. Prefer ICS_INBOUND_API_KEY.</summary>
    public string IcsInboundApiKey { get; set; } = string.Empty;

    public string ResolveAllocationsUrl() =>
        ResolveFeedUrl(AllocationsUrl, "allocations");

    public string ResolveBookingsUrl() =>
        ResolveFeedUrl(BookingsUrl, "bookings");

    public string ResolveInventoryUrl() =>
        ResolveFeedUrl(InventoryUrl, "inventory");

    private string ResolveFeedUrl(string explicitUrl, string segment)
    {
        if (!string.IsNullOrWhiteSpace(explicitUrl))
            return explicitUrl.Trim();

        if (string.IsNullOrWhiteSpace(IcsApiBaseUrl))
            return string.Empty;

        return $"{IcsApiBaseUrl.Trim().TrimEnd('/')}/{segment}";
    }

    /// <summary>
    /// When true, ICS POSTs transfer data to BookUrl as soon as the transfer QR is published.
    /// Default false — payment approval only publishes the QR; use BookLogicteck (Send to LOGICTECK) explicitly.
    /// </summary>
    public bool AutoTransferOnQrPublish { get; set; } = false;
}
