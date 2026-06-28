using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.Logicteck;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class LogicteckOutboundClient
{
    private readonly HttpClient _httpClient;
    private readonly LogicteckOptions _options;

    public LogicteckOutboundClient(HttpClient httpClient, IOptions<LogicteckOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<(bool Success, string? ExternalRef, string? Error)> SubmitBookingAsync(
        LogicteckOutboundPayload payload,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.BookUrl))
            return (true, null, null);

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.BookUrl)
        {
            Content = JsonContent.Create(payload),
        };

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            request.Headers.TryAddWithoutValidation("X-Logicteck-Api-Key", _options.ApiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            return (false, null, $"Could not reach LOGICTECK: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return (false, null, $"LOGICTECK returned {(int)response.StatusCode}: {body}");
        }

        try
        {
            var result = await response.Content.ReadFromJsonAsync<LogicteckBookResult>(cancellationToken: cancellationToken);
            return (true, result?.Reference, null);
        }
        catch
        {
            return (true, null, null);
        }
    }

    private sealed record LogicteckBookResult([property: JsonPropertyName("reference")] string? Reference);

    public async Task<(bool Success, string? ExternalRef, string? Error)> SubmitEmptyReturnAsync(
        LogicteckEmptyReturnTransmissionPayload payload,
        CancellationToken cancellationToken = default)
    {
        var targetUrl = !string.IsNullOrWhiteSpace(_options.EmptyReturnUrl)
            ? _options.EmptyReturnUrl
            : _options.BookUrl;

        if (string.IsNullOrWhiteSpace(targetUrl))
            return (true, null, null);

        using var request = new HttpRequestMessage(HttpMethod.Post, targetUrl)
        {
            Content = JsonContent.Create(payload),
        };

        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            request.Headers.TryAddWithoutValidation("X-Logicteck-Api-Key", _options.ApiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            return (false, null, $"Could not reach LOGICTECK: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return (false, null, $"LOGICTECK returned {(int)response.StatusCode}: {body}");
        }

        try
        {
            var result = await response.Content.ReadFromJsonAsync<LogicteckBookResult>(cancellationToken: cancellationToken);
            return (true, result?.Reference, null);
        }
        catch
        {
            return (true, null, null);
        }
    }
}

public record LogicteckOutboundPayload(
    string BookingReference,
    string ContainerNo,
    string ShippingLine,
    string Trucker,
    string PreAdviceReference,
    string ScheduledDate,
    string ScheduledTime,
    string Depot);
