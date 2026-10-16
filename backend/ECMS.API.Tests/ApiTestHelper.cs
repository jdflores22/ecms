using System.Net.Http.Headers;
using ECMS.Application;
using ECMS.Application.DTOs.Schedule;
using ECMS.Domain.Common;
using ECMS.Domain.Enums;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ECMS.API.Tests;

public static class ApiTestHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
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
        var line = lookups.ShippingLines.FirstOrDefault(l => l.Code == "MAERSK")
            ?? lookups.ShippingLines[0];
        var size = lookups.ContainerSizes.FirstOrDefault(s => s.Label == "20")
            ?? lookups.ContainerSizes[0];
        return new
        {
            shippingLineId = line.Id,
            containerNo = Iso6346ContainerNumber.WithCheckDigit(
                $"TEST{Random.Shared.Next(0, 1_000_000):D6}"),
            containerSizeId = size.Id,
            containerTypeId = lookups.ContainerTypes[0].Id,
            remarks = remarks ?? $"Integration test {Guid.NewGuid():N}",
        };
    }

    public static async Task ApprovePreAdviceForTestAsync(
        HttpClient client,
        int preAdviceId,
        string? remarks = null)
    {
        var adminToken = await LoginAsync(client, "admin", "Admin@123");
        UseBearer(client, adminToken);

        var context = await client.GetFromJsonAsync<CyAllocationForApprovalResponse>(
            $"/api/cy-allocations/for-approval/{preAdviceId}");
        if (context is null || context.Allocations.Count == 0)
            throw new InvalidOperationException("No CY allocations found for pre-forecast approval.");

        var depot = context.Allocations.FirstOrDefault(a => a.HasCapacity)
            ?? context.Allocations.OrderByDescending(a => a.AvailableCount).First();

        var demurrageValidUntil = PhilippinesTime.AddDays(PhilippinesTime.Today, 60).ToString("yyyy-MM-dd");
        var approveResponse = await client.PostAsJsonAsync("/api/evaluations/approve", new
        {
            preAdviceId,
            depotId = depot.DepotId,
            demurrageValidUntil,
            remarks = remarks ?? "Approved in integration test",
        });
        approveResponse.EnsureSuccessStatusCode();
    }

    private record CyAllocationForApprovalResponse(
        int PreAdviceId,
        List<CyAllocationDepotOption> Allocations);

    private record CyAllocationDepotOption(int DepotId, int AvailableCount, bool HasCapacity);

    private record HourlySlotAvailabilityResponse(
        int DepotId,
        List<HourlySlotInfo> Slots);

    private record HourlySlotInfo(string Time, string TimeLabel, bool IsAvailable);

    public static async Task AssignDepotScheduleForTestAsync(
        HttpClient client,
        int scheduleId,
        int depotId,
        string depotToken)
    {
        UseBearer(client, depotToken);
        var earliest = DepotScheduleDateRules.EarliestAssignmentDate();
        string? lastError = null;

        for (var offset = 0; offset < 45; offset++)
        {
            var date = earliest.AddDays(offset);
            var dateStr = date.ToString("yyyy-MM-dd");

            var hourly = await client.GetFromJsonAsync<HourlySlotAvailabilityResponse>(
                $"/api/schedules/hourly-slots?depotId={depotId}&date={dateStr}&excludeScheduleId={scheduleId}",
                JsonOptions);
            if (hourly?.Slots.Any(s => s.IsAvailable) != true)
                continue;

            var hour = hourly.Slots
                .Where(s => s.IsAvailable)
                .Select(s => ResolveHourlySlotHour(s))
                .FirstOrDefault(h => h is >= 8 and <= 17);
            if (hour == 0)
                continue;

            var updateResponse = await client.PutAsJsonAsync(
                $"/api/schedules/{scheduleId}",
                new UpdateScheduleRequest(
                    DateOnly.Parse(dateStr),
                    new TimeOnly(hour, 0),
                    0,
                    ScheduleStatus.Scheduled,
                    null,
                    null),
                JsonOptions);
            if (updateResponse.IsSuccessStatusCode)
                return;

            lastError = await updateResponse.Content.ReadAsStringAsync();
        }

        throw new InvalidOperationException(
            lastError ?? "No hourly return slot available for integration test.");
    }

    private static int ResolveHourlySlotHour(HourlySlotInfo slot)
    {
        if (!string.IsNullOrWhiteSpace(slot.Time)
            && TimeOnly.TryParse(slot.Time, out var parsed)
            && !(parsed.Hour == 0 && parsed.Minute == 0))
        {
            return parsed.Hour;
        }

        if (!string.IsNullOrWhiteSpace(slot.TimeLabel) && slot.TimeLabel.Length >= 2)
        {
            return int.Parse(slot.TimeLabel[..2], System.Globalization.CultureInfo.InvariantCulture);
        }

        return 0;
    }

    public static async Task EnsureReturnProofUploadEnabledAsync(HttpClient client)
    {
        var adminToken = await LoginAsync(client, "admin", "Admin@123");
        UseBearer(client, adminToken);
        var pilotResponse = await client.PutAsJsonAsync(
            "/api/payments/settings/pilot",
            new { pilotTestingEnabled = false, durationDays = 30, developerPassword = (string?)null },
            JsonOptions);
        if (!pilotResponse.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Pilot settings update failed ({(int)pilotResponse.StatusCode}): {await pilotResponse.Content.ReadAsStringAsync()}");
        }

        var payMongoResponse = await client.PutAsJsonAsync(
            "/api/payments/settings/paymongo",
            new { payMongoEnabled = false, allowProofUpload = true, developerPassword = (string?)null },
            JsonOptions);
        if (!payMongoResponse.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"PayMongo settings update failed ({(int)payMongoResponse.StatusCode}): {await payMongoResponse.Content.ReadAsStringAsync()}");
        }
    }

    public static async Task<int> UploadPaymentProofForTestAsync(
        HttpClient client,
        string truckerToken,
        int scheduleId)
    {
        await EnsureReturnProofUploadEnabledAsync(client);
        UseBearer(client, truckerToken);
        using var form = new MultipartFormDataContent
        {
            { new StringContent(scheduleId.ToString()), "scheduleId" },
            { new StringContent($"TEST-{scheduleId}-{Guid.NewGuid():N}"[..24]), "proofReferenceNo" },
        };
        var pngBytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "proof", "proof.png");

        var uploadResponse = await client.PostAsync("/api/payments/upload", form);
        if (!uploadResponse.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                await uploadResponse.Content.ReadAsStringAsync());
        }
        var payment = await uploadResponse.Content.ReadFromJsonAsync<PaymentResponse>(JsonOptions);
        return payment?.Id ?? throw new InvalidOperationException("Payment upload did not return an id.");
    }

    public static async Task VerifyPaymentForTestAsync(HttpClient client, int paymentId)
    {
        var adminToken = await LoginAsync(client, "admin", "Admin@123");
        UseBearer(client, adminToken);
        var verifyResponse = await client.PostAsJsonAsync(
            $"/api/payments/{paymentId}/verify",
            new { approved = true });
        verifyResponse.EnsureSuccessStatusCode();
    }

    public static async Task UploadAllStandardPhotosAsync(HttpClient client, int preAdviceId)
    {
        var categories = new[]
        {
            "Flooring",
            "RightSideIn",
            "LeftSideIn",
            "Back",
            "Backdoor",
            "Front",
            "LeftSideOut",
            "RightSideOut",
            "CscPlate",
            "CroEdo",
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
