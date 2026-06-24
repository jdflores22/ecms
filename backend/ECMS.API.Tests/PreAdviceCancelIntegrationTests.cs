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
    public async Task Broker_can_cancel_submitted_pre_advice()
    {
        var brokerToken = await ApiTestHelper.LoginAsync(_client, "broker1", "Broker@123");
        ApiTestHelper.UseBearer(_client, brokerToken);

        var lookups = await _client.GetFromJsonAsync<LookupResponse>("/api/preadvice/lookups");
        Assert.NotNull(lookups);

        var lineId = lookups.ShippingLines[0].Id;
        var containerId = lookups.Containers.First(c => c.ShippingLineId == lineId).Id;

        var createResponse = await _client.PostAsJsonAsync("/api/preadvice", new
        {
            shippingLineId = lineId,
            containerId,
            remarks = $"Cancel test {Guid.NewGuid():N}",
        });
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        var submitResponse = await _client.PostAsync($"/api/preadvice/{preAdvice.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var cancelResponse = await _client.PostAsJsonAsync(
            $"/api/preadvice/{preAdvice.Id}/cancel",
            new { reason = "Broker withdrew request" });
        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        var cancelled = await cancelResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(cancelled);
        Assert.Equal("Cancelled", cancelled.Status);
    }

    [Fact]
    public async Task Cancel_on_draft_pre_advice_returns_bad_request()
    {
        var brokerToken = await ApiTestHelper.LoginAsync(_client, "broker1", "Broker@123");
        ApiTestHelper.UseBearer(_client, brokerToken);

        var lookups = await _client.GetFromJsonAsync<LookupResponse>("/api/preadvice/lookups");
        Assert.NotNull(lookups);

        var lineId = lookups.ShippingLines[0].Id;
        var containerId = lookups.Containers.First(c => c.ShippingLineId == lineId).Id;

        var createResponse = await _client.PostAsJsonAsync("/api/preadvice", new
        {
            shippingLineId = lineId,
            containerId,
        });
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        var cancelResponse = await _client.PostAsJsonAsync($"/api/preadvice/{preAdvice.Id}/cancel", new { });
        Assert.Equal(HttpStatusCode.BadRequest, cancelResponse.StatusCode);
    }

    private record LookupResponse(
        List<LookupLine> ShippingLines,
        List<LookupContainer> Containers);

    private record LookupLine(int Id, string Name, string Code);

    private record LookupContainer(int Id, string ContainerNo, string Size, string Type, int ShippingLineId);
}
