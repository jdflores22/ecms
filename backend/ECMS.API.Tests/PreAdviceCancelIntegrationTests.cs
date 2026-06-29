using System.Net;
using System.Net.Http.Json;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class PreAdviceCancelIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PreAdviceCancelIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Trucker_can_cancel_submitted_pre_advice()
    {
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Cancel test {Guid.NewGuid():N}"));
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        await ApiTestHelper.UploadAllStandardPhotosAsync(_client, preAdvice.Id);

        var submitResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var cancelResponse = await _client.PostAsJsonAsync(
            $"/api/preforecast/{preAdvice.Id}/cancel",
            new { reason = "Trucker withdrew request" });
        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        var cancelled = await cancelResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(cancelled);
        Assert.Equal("Cancelled", cancelled.Status);
    }

    [Fact]
    public async Task Cancel_on_draft_pre_advice_returns_bad_request()
    {
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups));
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        var cancelResponse = await _client.PostAsJsonAsync($"/api/preforecast/{preAdvice.Id}/cancel", new { });
        Assert.Equal(HttpStatusCode.BadRequest, cancelResponse.StatusCode);
    }
}
