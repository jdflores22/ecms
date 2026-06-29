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

    public record PreAdviceLookupResponse(
        List<LookupLine> ShippingLines,
        List<LookupSize> ContainerSizes,
        List<LookupType> ContainerTypes);

    public record LookupLine(int Id, string Name, string Code);

    public record LookupSize(int Id, string Label);

    public record LookupType(int Id, string Code, string Label);

    public static object BuildCreatePreAdvicePayload(PreAdviceLookupResponse lookups, string? remarks = null)
    {
        var lineId = lookups.ShippingLines[0].Id;
        return new
        {
            shippingLineId = lineId,
            containerNo = $"TEST{Guid.NewGuid():N}"[..11].ToUpperInvariant(),
            containerSizeId = lookups.ContainerSizes[0].Id,
            containerTypeId = lookups.ContainerTypes[0].Id,
            remarks = remarks ?? $"Integration test {Guid.NewGuid():N}",
        };
    }

    public static async Task UploadAllStandardPhotosAsync(HttpClient client, int preAdviceId)
    {
        var categories = new[]
        {
            "Flooring",
            "RightSideIn",
            "LeftSideIn",
            "Back",
            "Front",
            "LeftSideOut",
            "RightSideOut",
        };

        var pngBytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

        foreach (var category in categories)
        {
            using var form = new MultipartFormDataContent();
            var fileContent = new ByteArrayContent(pngBytes);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            form.Add(fileContent, "file", $"{category.Replace(' ', '-').ToLowerInvariant()}.png");
            form.Add(new StringContent(category), "category");

            var response = await client.PostAsync($"/api/preforecast/{preAdviceId}/documents", form);
            response.EnsureSuccessStatusCode();
        }
    }
}
