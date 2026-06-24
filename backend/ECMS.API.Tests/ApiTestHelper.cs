using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ECMS.API.Tests;

public static class ApiTestHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static async Task<string> LoginAsync(HttpClient client, string username, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        return auth?.AccessToken ?? throw new InvalidOperationException("Login did not return a token.");
    }

    public static void UseBearer(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    public static void ClearAuth(HttpClient client)
    {
        client.DefaultRequestHeaders.Authorization = null;
    }

    public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserInfo User);

    public record UserInfo(
        int Id,
        string Username,
        string Email,
        string FullName,
        string Role,
        int? ShippingLineId,
        int? DepotId);

    public record PreAdviceResponse(
        int Id,
        string ReferenceNo,
        string Status,
        int ShippingLineId,
        int ContainerId);

    public record ScheduleResponse(
        int Id,
        string ReferenceNo,
        int DepotId,
        string Status);

    public record DepotResponse(int Id, string Name);

    public record PaymentResponse(int Id, int ScheduleId, string Status);
}
