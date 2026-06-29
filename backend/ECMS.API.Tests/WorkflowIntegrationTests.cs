using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

using ECMS.Domain.Common;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class WorkflowIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public WorkflowIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Trucker_through_evaluator_depot_workflow_completes_with_qr()
    {
        // 1. Trucker — create and submit pre-forecast
        var submitterToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, submitterToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);
        Assert.NotEmpty(lookups.ShippingLines);
        Assert.NotEmpty(lookups.ContainerSizes);
        Assert.NotEmpty(lookups.ContainerTypes);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Integration test {Guid.NewGuid():N}"));
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        await ApiTestHelper.UploadAllStandardPhotosAsync(_client, preAdvice.Id);

        var submitResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        // 2. Evaluator — approve and assign CY
        var evaluatorToken = await ApiTestHelper.LoginAsync(_client, "evaluator1", "Evaluator@123");
        ApiTestHelper.UseBearer(_client, evaluatorToken);

        var depots = await _client.GetFromJsonAsync<List<ApiTestHelper.DepotResponse>>("/api/depots");
        Assert.NotNull(depots);
        Assert.NotEmpty(depots);
        var depotId = depots[0].Id;

        var approveResponse = await _client.PostAsJsonAsync("/api/evaluations/approve", new
        {
            preAdviceId = preAdvice.Id,
            depotId,
            remarks = "Approved in integration test",
        });
        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);

        // 3. Depot — assign schedule and trucker
        var depotToken = await ApiTestHelper.LoginAsync(_client, "depot1", "Depot@123");
        ApiTestHelper.UseBearer(_client, depotToken);

        var schedules = await _client.GetFromJsonAsync<List<ApiTestHelper.ScheduleResponse>>("/api/schedules");
        Assert.NotNull(schedules);
        var schedule = schedules.First(s => s.ReferenceNo == preAdvice.ReferenceNo);

        var truckers = await _client.GetFromJsonAsync<List<TruckerResponse>>("/api/users/truckers");
        Assert.NotNull(truckers);
        Assert.NotEmpty(truckers);

        var tomorrow = PhilippinesTime.AddDays(PhilippinesTime.Today, 1);
        var dateStr = tomorrow.ToString("yyyy-MM-dd");

        var updateResponse = await _client.PutAsJsonAsync($"/api/schedules/{schedule.Id}", new
        {
            date = dateStr,
            time = "08:00:00",
            slotNo = 0,
            status = "Scheduled",
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        // 4. Trucker — upload payment proof
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        using var form = new MultipartFormDataContent
        {
            { new StringContent(schedule.Id.ToString()), "scheduleId" },
            { new StringContent("1500.00"), "amount" },
        };
        var pngBytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "proof", "proof.png");

        var uploadResponse = await _client.PostAsync("/api/payments/upload", form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);
        var payment = await uploadResponse.Content.ReadFromJsonAsync<ApiTestHelper.PaymentResponse>();
        Assert.NotNull(payment);

        // 5. Depot — verify payment (issues QR)
        ApiTestHelper.UseBearer(_client, depotToken);
        var verifyResponse = await _client.PostAsync($"/api/payments/{payment.Id}/verify?approved=true", null);
        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        // 6. Trucker — QR available
        ApiTestHelper.UseBearer(_client, truckerToken);
        var qrResponse = await _client.GetAsync($"/api/qr/schedule/{schedule.Id}");
        Assert.Equal(HttpStatusCode.OK, qrResponse.StatusCode);
    }

    private record TruckerResponse(int Id, string Username, string FullName);
}
