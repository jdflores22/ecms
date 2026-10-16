namespace ECMS.Application.Configuration;

/// <summary>Effective LOGICTECK ICS feed URLs for a yard (depot overrides + global fallback).</summary>
public sealed class LogicteckFeedEndpoints
{
    public string? IcsApiBaseUrl { get; init; }
    public string? AllocationsUrl { get; init; }
    public string? BookingsUrl { get; init; }
    public string? InventoryUrl { get; init; }
    public string IcsInboundApiKey { get; init; } = string.Empty;

    public static LogicteckFeedEndpoints FromOptions(LogicteckOptions options) =>
        new()
        {
            IcsApiBaseUrl = TrimOrNull(options.IcsApiBaseUrl),
            AllocationsUrl = TrimOrNull(options.AllocationsUrl),
            BookingsUrl = TrimOrNull(options.BookingsUrl),
            InventoryUrl = TrimOrNull(options.InventoryUrl),
            IcsInboundApiKey = options.IcsInboundApiKey ?? string.Empty,
        };

    public static LogicteckFeedEndpoints ForDepot(
        string? depotIcsBaseUrl,
        string? depotAllocationsUrl,
        string? depotBookingsUrl,
        string? depotInventoryUrl,
        LogicteckOptions global) =>
        new()
        {
            IcsApiBaseUrl = FirstNonEmpty(depotIcsBaseUrl, global.IcsApiBaseUrl),
            AllocationsUrl = FirstNonEmpty(depotAllocationsUrl, global.AllocationsUrl),
            BookingsUrl = FirstNonEmpty(depotBookingsUrl, global.BookingsUrl),
            InventoryUrl = FirstNonEmpty(depotInventoryUrl, global.InventoryUrl),
            IcsInboundApiKey = global.IcsInboundApiKey ?? string.Empty,
        };

    public string ResolveAllocationsUrl() => ResolveFeedUrl(AllocationsUrl, IcsApiBaseUrl, "allocations");

    public string ResolveBookingsUrl() => ResolveFeedUrl(BookingsUrl, IcsApiBaseUrl, "bookings");

    public string ResolveInventoryUrl() => ResolveFeedUrl(InventoryUrl, IcsApiBaseUrl, "inventory");

    /// <summary>LOGICTECK container identity photos for an inventory row (when exposed by the yard API).</summary>
    public string ResolveContainerPhotosUrl(string inventoryRowId)
    {
        if (string.IsNullOrWhiteSpace(inventoryRowId))
            return string.Empty;

        if (!string.IsNullOrWhiteSpace(IcsApiBaseUrl))
            return $"{IcsApiBaseUrl.Trim().TrimEnd('/')}/inventory/{Uri.EscapeDataString(inventoryRowId.Trim())}/photos";

        return string.Empty;
    }

    private static string ResolveFeedUrl(string? explicitUrl, string? baseUrl, string segment)
    {
        if (!string.IsNullOrWhiteSpace(explicitUrl))
            return explicitUrl.Trim();

        if (!string.IsNullOrWhiteSpace(baseUrl))
            return $"{baseUrl.Trim().TrimEnd('/')}/{segment}";

        return string.Empty;
    }

    private static string? FirstNonEmpty(string? depotValue, string? globalValue) =>
        !string.IsNullOrWhiteSpace(depotValue) ? depotValue.Trim() : TrimOrNull(globalValue);

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
