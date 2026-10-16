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

        await ApiTestHelper.ApprovePreAdviceForTestAsync(
            _client,
            preAdvice.Id,
            "Approved in integration test");

        // 3. Depot — assign schedule and trucker
        var depotToken = await ApiTestHelper.LoginAsync(_client, "depot1", "Depot@123");
        ApiTestHelper.UseBearer(_client, depotToken);

        var schedules = await _client.GetFromJsonAsync<List<ApiTestHelper.ScheduleResponse>>("/api/schedules");
        Assert.NotNull(schedules);
        var schedule = schedules.First(s => s.ReferenceNo == preAdvice.ReferenceNo);

        await ApiTestHelper.AssignDepotScheduleForTestAsync(
            _client,
            schedule.Id,
            schedule.DepotId,
            depotToken);

        // 4. Trucker — upload payment proof
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        var paymentId = await ApiTestHelper.UploadPaymentProofForTestAsync(_client, truckerToken, schedule.Id);

        // 5. ICS admin — verify payment (issues QR)
        await ApiTestHelper.VerifyPaymentForTestAsync(_client, paymentId);

        // 6. Trucker — QR available
        ApiTestHelper.UseBearer(_client, truckerToken);
        var qrResponse = await _client.GetAsync($"/api/qr/schedule/{schedule.Id}");
        Assert.Equal(HttpStatusCode.OK, qrResponse.StatusCode);
    }

    private record TruckerResponse(int Id, string Username, string FullName);
}
