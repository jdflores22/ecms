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
    public async Task Trucker_can_upload_and_list_container_identity_photos()
    {
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Photo test {Guid.NewGuid():N}"));
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png-content"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "flooring.png");
        form.Add(new StringContent("Flooring"), "category");

        var uploadResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<DocumentResponse>();
        Assert.NotNull(uploaded);
        Assert.Equal("Flooring", uploaded.Category);
        Assert.Equal("Flooring", uploaded.CategoryLabel);

        var listResponse = await _client.GetAsync($"/api/preforecast/{preAdvice.Id}/documents");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var documents = await listResponse.Content.ReadFromJsonAsync<List<DocumentResponse>>();
        Assert.NotNull(documents);
        Assert.Single(documents);
        Assert.Equal("flooring.png", documents[0].FileName);
    }

    [Fact]
    public async Task Damage_photo_requires_comment()
    {
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Damage test {Guid.NewGuid():N}"));
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "damage.png");
        form.Add(new StringContent("Damage"), "category");

        var uploadResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.BadRequest, uploadResponse.StatusCode);
    }

    [Fact]
    public async Task Trucker_can_upload_optional_others_photo_without_blocking_submit()
    {
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Others photo test {Guid.NewGuid():N}"));
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        await ApiTestHelper.UploadAllStandardPhotosAsync(_client, preAdvice.Id);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png-content"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "others.png");
        form.Add(new StringContent("Others"), "category");

        var uploadResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<DocumentResponse>();
        Assert.NotNull(uploaded);
        Assert.Equal("Others", uploaded.Category);
        Assert.Equal("Others (optional)", uploaded.CategoryLabel);

        var submitResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/submit", null);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
    }

    [Fact]
    public async Task Evaluator_can_list_container_photos_for_review()
    {
        var truckerToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, truckerToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Evaluator photo test {Guid.NewGuid():N}"));
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake-png"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "front.png");
        form.Add(new StringContent("Front"), "category");
        var uploadResponse = await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/documents", form);
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

        await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/submit", null);

        var evaluatorToken = await ApiTestHelper.LoginAsync(_client, "evaluator1", "Evaluator@123");
        ApiTestHelper.UseBearer(_client, evaluatorToken);

        var listResponse = await _client.GetAsync($"/api/preforecast/{preAdvice.Id}/documents");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var documents = await listResponse.Content.ReadFromJsonAsync<List<DocumentResponse>>();
        Assert.NotNull(documents);
        Assert.Single(documents);
        Assert.Equal("Front", documents[0].Category);
    }

    private record DocumentResponse(
        int Id,
        string FileName,
        string FilePath,
        string? Category,
        string? CategoryLabel,
        string? Comment);
}
