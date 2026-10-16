using System.Net.Http.Json;
using System.Text.Json;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.ContainerInventory;
using ECMS.Application.DTOs.CyAllocation;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class LogicteckIcsFeedClient
{
    private readonly HttpClient _httpClient;
    private readonly LogicteckOptions _options;

    public LogicteckIcsFeedClient(HttpClient httpClient, IOptions<LogicteckOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<(string Yard, DateTimeOffset GeneratedAt, IReadOnlyList<LogicteckCyLineDto> Lines)> GetAllocationsAsync(
        LogicteckFeedEndpoints endpoints,
        CancellationToken cancellationToken = default)
    {
        var payload = await GetAsync<LogicteckAllocationsPayload>(endpoints.ResolveAllocationsUrl(), endpoints, cancellationToken);

        var lines = (payload.Lines ?? new List<LogicteckLinePayload>())
            .Select(line => new LogicteckCyLineDto(
                line.Code ?? string.Empty,
                line.FullName ?? string.Empty,
                MapTeu(line.Teu),
                MapSize(line.Size20),
                MapSize(line.Size40)))
            .ToList();

        return (payload.Yard ?? string.Empty, payload.GeneratedAt, lines);
    }

    public async Task<LogicteckPagedFeedDto<LogicteckBookingRowDto>> GetBookingsAsync(
        LogicteckFeedEndpoints endpoints,
        int offset,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var payload = await GetAsync<LogicteckBookingsPayload>(
            AppendPaging(endpoints.ResolveBookingsUrl(), offset, limit),
            endpoints,
            cancellationToken);

        var items = (payload.Bookings ?? new List<LogicteckBookingPayload>())
            .Select(MapBooking)
            .ToList();

        return new LogicteckPagedFeedDto<LogicteckBookingRowDto>(
            payload.Yard ?? string.Empty,
            payload.GeneratedAt,
            payload.Total,
            payload.Offset,
            payload.Limit,
            payload.NextOffset,
            items);
    }

    public async Task<LogicteckPagedFeedDto<LogicteckInventoryRowDto>> GetInventoryAsync(
        LogicteckFeedEndpoints endpoints,
        int offset,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var payload = await GetAsync<LogicteckInventoryPayload>(
            AppendPaging(endpoints.ResolveInventoryUrl(), offset, limit),
            endpoints,
            cancellationToken);

        var items = (payload.Containers ?? new List<LogicteckInventoryContainerPayload>())
            .Select(MapInventory)
            .ToList();

        return new LogicteckPagedFeedDto<LogicteckInventoryRowDto>(
            payload.Yard ?? string.Empty,
            payload.GeneratedAt,
            payload.Total,
            payload.Offset,
            payload.Limit,
            payload.NextOffset,
            items);
    }

    public async Task<IReadOnlyList<LogicteckInventoryRowDto>> GetAllInventoryAsync(
        LogicteckFeedEndpoints endpoints,
        CancellationToken cancellationToken = default)
    {
        var all = new List<LogicteckInventoryRowDto>();
        var offset = 0;
        int? nextOffset;

        do
        {
            var page = await GetInventoryAsync(endpoints, offset, 100, cancellationToken);
            all.AddRange(page.Items);
            nextOffset = page.NextOffset;
            if (nextOffset is null)
                break;
            offset = nextOffset.Value;
        }
        while (true);

        return all;
    }

    public async Task<IReadOnlyList<LogicteckContainerPhotoDto>> TryGetContainerPhotosAsync(
        LogicteckFeedEndpoints endpoints,
        string inventoryRowId,
        CancellationToken cancellationToken = default)
    {
        var url = endpoints.ResolveContainerPhotosUrl(inventoryRowId);
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(endpoints.IcsInboundApiKey))
            return Array.Empty<LogicteckContainerPhotoDto>();

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("X-ICS-Api-Key", endpoints.IcsInboundApiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch
        {
            return Array.Empty<LogicteckContainerPhotoDto>();
        }

        if (!response.IsSuccessStatusCode)
            return Array.Empty<LogicteckContainerPhotoDto>();

        var payload = await response.Content.ReadFromJsonAsync<LogicteckContainerPhotosPayload>(
            new JsonSerializerOptions(JsonSerializerDefaults.Web),
            cancellationToken);

        if (payload is null)
            return Array.Empty<LogicteckContainerPhotoDto>();

        var items = payload.Photos ?? payload.Documents ?? new List<LogicteckContainerPhotoPayload>();
        return items
            .Where(p => !string.IsNullOrWhiteSpace(p.Url))
            .Select(p => new LogicteckContainerPhotoDto(
                p.Url!.Trim(),
                string.IsNullOrWhiteSpace(p.Label) ? p.CategoryLabel : p.Label,
                p.Category))
            .ToList();
    }

    private async Task<T> GetAsync<T>(string url, LogicteckFeedEndpoints endpoints, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(endpoints.IcsInboundApiKey))
        {
            throw new InvalidOperationException(
                "LOGICTECK ICS feeds are not configured. Set yard URLs in Admin → Settings, or Logicteck:IcsApiBaseUrl and ICS_INBOUND_API_KEY on the server.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("X-ICS-Api-Key", endpoints.IcsInboundApiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Could not reach LOGICTECK ICS feed: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"LOGICTECK ICS feed returned {(int)response.StatusCode} for {url}.");
        }

        return await response.Content.ReadFromJsonAsync<T>(
                   new JsonSerializerOptions(JsonSerializerDefaults.Web),
                   cancellationToken)
               ?? throw new InvalidOperationException("LOGICTECK ICS feed returned an empty body.");
    }

    private static string AppendPaging(string url, int offset, int limit)
    {
        var safeOffset = Math.Max(0, offset);
        var safeLimit = Math.Clamp(limit, 1, 500);
        var separator = url.Contains('?', StringComparison.Ordinal) ? '&' : '?';
        return $"{url}{separator}offset={safeOffset}&limit={safeLimit}";
    }

    private static LogicteckTeuSnapshotDto MapTeu(LogicteckTeuPayload? teu) =>
        new(teu?.Used ?? 0, teu?.Limit ?? 0, teu?.Percent ?? 0);

    private static LogicteckSizeSnapshotDto MapSize(LogicteckSizePayload? size) =>
        new(
            size?.InYard ?? 0,
            size?.Pending ?? 0,
            size?.Effective ?? 0,
            size?.Limit ?? 0,
            size?.Percent ?? 0,
            size?.OnHold ?? false,
            size?.AutoHold ?? false);

    private static LogicteckBookingRowDto MapBooking(LogicteckBookingPayload row) =>
        new(
            row.Id ?? string.Empty,
            row.Reference ?? string.Empty,
            row.Type ?? string.Empty,
            row.Status ?? string.Empty,
            new LogicteckBookingShippingLineDto(
                row.ShippingLine?.Code ?? string.Empty,
                row.ShippingLine?.FullName ?? string.Empty),
            row.BlNumber,
            row.ContainerSize ?? string.Empty,
            row.ContainerType ?? string.Empty,
            row.Quantity,
            (row.Containers ?? new List<LogicteckBookingContainerPayload>())
                .Select(c => new LogicteckBookingContainerDto(c.Number ?? string.Empty, c.Status ?? string.Empty))
                .ToList(),
            row.Date,
            row.TimeSlot,
            row.TruckingCompany,
            row.PlateNumber,
            row.IsVerified,
            row.CreatedAt,
            row.UpdatedAt,
            row.LastActivity is null
                ? null
                : new LogicteckBookingActivityDto(row.LastActivity.Status ?? string.Empty, row.LastActivity.At));

    private static LogicteckInventoryRowDto MapInventory(LogicteckInventoryContainerPayload row) =>
        new(
            row.Id ?? string.Empty,
            row.ContainerNumber ?? string.Empty,
            new LogicteckInventoryShippingLineDto(
                row.ShippingLine?.Code ?? string.Empty,
                row.ShippingLine?.FullName ?? string.Empty),
            row.ContainerSize ?? string.Empty,
            row.ContainerType ?? string.Empty,
            row.Class,
            row.Teu,
            row.InYard,
            row.GateInAt,
            row.EirNumber,
            row.Condition,
            row.Cleanliness,
            row.Status ?? string.Empty,
            row.Repair is null ? null : new LogicteckInventoryRepairDto(row.Repair.MnrComplete),
            row.TruckingCompany,
            row.PlateNumber,
            row.BookingId);

    private sealed class LogicteckAllocationsPayload
    {
        public string? Yard { get; set; }
        public DateTimeOffset GeneratedAt { get; set; }
        public List<LogicteckLinePayload>? Lines { get; set; }
    }

    private sealed class LogicteckLinePayload
    {
        public string? Code { get; set; }
        public string? FullName { get; set; }
        public LogicteckTeuPayload? Teu { get; set; }
        public LogicteckSizePayload? Size20 { get; set; }
        public LogicteckSizePayload? Size40 { get; set; }
    }

    private sealed class LogicteckTeuPayload
    {
        public int Used { get; set; }
        public int Limit { get; set; }
        public int Percent { get; set; }
    }

    private sealed class LogicteckSizePayload
    {
        public int InYard { get; set; }
        public int Pending { get; set; }
        public int Effective { get; set; }
        public int Limit { get; set; }
        public int Percent { get; set; }
        public bool OnHold { get; set; }
        public bool AutoHold { get; set; }
    }

    private sealed class LogicteckBookingsPayload
    {
        public string? Yard { get; set; }
        public DateTimeOffset GeneratedAt { get; set; }
        public int Total { get; set; }
        public int Offset { get; set; }
        public int Limit { get; set; }
        public int? NextOffset { get; set; }
        public List<LogicteckBookingPayload>? Bookings { get; set; }
    }

    private sealed class LogicteckBookingPayload
    {
        public string? Id { get; set; }
        public string? Reference { get; set; }
        public string? Type { get; set; }
        public string? Status { get; set; }
        public LogicteckBookingShippingLinePayload? ShippingLine { get; set; }
        public string? BlNumber { get; set; }
        public string? ContainerSize { get; set; }
        public string? ContainerType { get; set; }
        public int Quantity { get; set; }
        public List<LogicteckBookingContainerPayload>? Containers { get; set; }
        public string? Date { get; set; }
        public string? TimeSlot { get; set; }
        public string? TruckingCompany { get; set; }
        public string? PlateNumber { get; set; }
        public bool IsVerified { get; set; }
        public DateTimeOffset? CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public LogicteckBookingActivityPayload? LastActivity { get; set; }
    }

    private sealed class LogicteckBookingShippingLinePayload
    {
        public string? Code { get; set; }
        public string? FullName { get; set; }
    }

    private sealed class LogicteckBookingContainerPayload
    {
        public string? Number { get; set; }
        public string? Status { get; set; }
    }

    private sealed class LogicteckBookingActivityPayload
    {
        public string? Status { get; set; }
        public DateTimeOffset At { get; set; }
    }

    private sealed class LogicteckInventoryPayload
    {
        public string? Yard { get; set; }
        public DateTimeOffset GeneratedAt { get; set; }
        public int Total { get; set; }
        public int Offset { get; set; }
        public int Limit { get; set; }
        public int? NextOffset { get; set; }
        public List<LogicteckInventoryContainerPayload>? Containers { get; set; }
    }

    private sealed class LogicteckInventoryContainerPayload
    {
        public string? Id { get; set; }
        public string? ContainerNumber { get; set; }
        public LogicteckBookingShippingLinePayload? ShippingLine { get; set; }
        public string? ContainerSize { get; set; }
        public string? ContainerType { get; set; }
        public string? Class { get; set; }
        public int Teu { get; set; }
        public bool InYard { get; set; }
        public DateTimeOffset? GateInAt { get; set; }
        public string? EirNumber { get; set; }
        public string? Condition { get; set; }
        public string? Cleanliness { get; set; }
        public string? Status { get; set; }
        public LogicteckInventoryRepairPayload? Repair { get; set; }
        public string? TruckingCompany { get; set; }
        public string? PlateNumber { get; set; }
        public string? BookingId { get; set; }
    }

    private sealed class LogicteckInventoryRepairPayload
    {
        public bool MnrComplete { get; set; }
    }

    private sealed class LogicteckContainerPhotosPayload
    {
        public List<LogicteckContainerPhotoPayload>? Photos { get; set; }
        public List<LogicteckContainerPhotoPayload>? Documents { get; set; }
    }

    private sealed class LogicteckContainerPhotoPayload
    {
        public string? Url { get; set; }
        public string? Label { get; set; }
        public string? Category { get; set; }
        public string? CategoryLabel { get; set; }
    }
}
