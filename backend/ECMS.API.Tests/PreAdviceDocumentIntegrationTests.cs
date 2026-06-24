using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class PreAdviceDocumentIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PreAdviceDocumentIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Broker_can_upload_and_list_container_identity_photos()
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
            remarks = $"Photo test {Guid.NewGuid():N}",
        });
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png-content"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "flooring.png");
        form.Add(new StringContent("Flooring"), "category");

        var uploadResponse = await _client.PostAsync($"/api/preadvice/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<DocumentResponse>();
        Assert.NotNull(uploaded);
        Assert.Equal("Flooring", uploaded.Category);
        Assert.Equal("Flooring", uploaded.CategoryLabel);

        var listResponse = await _client.GetAsync($"/api/preadvice/{preAdvice.Id}/documents");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var documents = await listResponse.Content.ReadFromJsonAsync<List<DocumentResponse>>();
        Assert.NotNull(documents);
        Assert.Single(documents);
        Assert.Equal("flooring.png", documents[0].FileName);
    }

    [Fact]
    public async Task Damage_photo_requires_comment()
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
            remarks = $"Damage test {Guid.NewGuid():N}",
        });
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "damage.png");
        form.Add(new StringContent("Damage"), "category");

        var uploadResponse = await _client.PostAsync($"/api/preadvice/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.BadRequest, uploadResponse.StatusCode);
    }

    [Fact]
    public async Task Evaluator_can_list_container_photos_for_review()
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
            remarks = $"Evaluator photo test {Guid.NewGuid():N}",
        });
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "front.png");
        form.Add(new StringContent("Front"), "category");
        var uploadResponse = await _client.PostAsync($"/api/preadvice/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        await _client.PostAsync($"/api/preadvice/{preAdvice.Id}/submit", null);

        var evaluatorToken = await ApiTestHelper.LoginAsync(_client, "evaluator1", "Evaluator@123");
        ApiTestHelper.UseBearer(_client, evaluatorToken);

        var listResponse = await _client.GetAsync($"/api/preadvice/{preAdvice.Id}/documents");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var documents = await listResponse.Content.ReadFromJsonAsync<List<DocumentResponse>>();
        Assert.NotNull(documents);
        Assert.Single(documents);
        Assert.Equal("Front", documents[0].Category);
    }

    private record LookupResponse(
        List<LookupLine> ShippingLines,
        List<LookupContainer> Containers);

    private record LookupLine(int Id, string Name, string Code);

    private record LookupContainer(int Id, string ContainerNo, string Size, string Type, int ShippingLineId);

    private record DocumentResponse(
        int Id,
        string FileName,
        string FilePath,
        string? Category,
        string? CategoryLabel,
        string? Comment);
}
