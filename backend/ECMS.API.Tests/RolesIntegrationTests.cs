using System.Net;
using System.Net.Http.Json;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class RolesIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public RolesIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Admin_roles_endpoint_denies_trucker()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, token);

        var response = await _client.GetAsync("/api/roles");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_can_list_and_update_role_capabilities()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "admin", "Admin@123");
        ApiTestHelper.UseBearer(_client, token);

        var listResponse = await _client.GetAsync("/api/roles");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var roles = await listResponse.Content.ReadFromJsonAsync<List<RoleCatalogResponse>>();
        Assert.NotNull(roles);
        Assert.NotEmpty(roles);

        var trucker = roles!.First(r => r.Name == "Trucker");
        var updatedCapabilities = trucker.Capabilities.Append("Integration test capability").Distinct().ToList();
        var updatedPages = trucker.AllowedPages.Where(p => p != "truckerReports").ToList();

        var updateResponse = await _client.PutAsJsonAsync("/api/roles/Trucker", new
        {
            description = trucker.Description,
            capabilities = updatedCapabilities,
            allowedPages = updatedPages,
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updated = await updateResponse.Content.ReadFromJsonAsync<RoleCatalogResponse>();
        Assert.NotNull(updated);
        Assert.Contains("Integration test capability", updated!.Capabilities);
        Assert.DoesNotContain("truckerReports", updated.AllowedPages);

        var restoreResponse = await _client.PutAsJsonAsync("/api/roles/Trucker", new
        {
            description = trucker.Description,
            capabilities = trucker.Capabilities,
            allowedPages = trucker.AllowedPages,
        });
        Assert.Equal(HttpStatusCode.OK, restoreResponse.StatusCode);
    }

    private sealed record RoleCatalogResponse(
        int Id,
        string Name,
        string Label,
        string Description,
        List<string> Capabilities,
        List<string> AllowedPages);
}
