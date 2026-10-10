using System.Net.Http.Json;
using System.Text.Json;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.CyAllocation;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class LogicteckAllocationClient
{
    private readonly HttpClient _httpClient;
    private readonly LogicteckOptions _options;

    public LogicteckAllocationClient(HttpClient httpClient, IOptions<LogicteckOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<(string Yard, DateTimeOffset GeneratedAt, IReadOnlyList<LogicteckCyLineDto> Lines)> GetAsync(
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.AllocationsUrl) || string.IsNullOrWhiteSpace(_options.IcsInboundApiKey))
        {
            throw new InvalidOperationException(
                "LOGICTECK allocations are not configured. Set Logicteck:AllocationsUrl and ICS_INBOUND_API_KEY.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, _options.AllocationsUrl);
        request.Headers.TryAddWithoutValidation("X-ICS-Api-Key", _options.IcsInboundApiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Could not reach LOGICTECK allocations: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"LOGICTECK allocations returned {(int)response.StatusCode}.");
        }

        var payload = await response.Content.ReadFromJsonAsync<LogicteckAllocationsPayload>(
            new JsonSerializerOptions(JsonSerializerDefaults.Web),
            cancellationToken)
            ?? throw new InvalidOperationException("LOGICTECK allocations returned an empty body.");

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
}
