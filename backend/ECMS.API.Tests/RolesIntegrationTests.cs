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
    public async Task Admin_roles_endpoint_denies_broker()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "broker1", "Broker@123");
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

        var broker = roles!.First(r => r.Name == "Broker");
        var updatedCapabilities = broker.Capabilities.Append("Integration test capability").Distinct().ToList();
        var updatedPages = broker.AllowedPages.Where(p => p != "reports").ToList();

        var updateResponse = await _client.PutAsJsonAsync("/api/roles/Broker", new
        {
            description = broker.Description,
            capabilities = updatedCapabilities,
            allowedPages = updatedPages,
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updated = await updateResponse.Content.ReadFromJsonAsync<RoleCatalogResponse>();
        Assert.NotNull(updated);
        Assert.Contains("Integration test capability", updated!.Capabilities);
        Assert.DoesNotContain("reports", updated.AllowedPages);

        var restoreResponse = await _client.PutAsJsonAsync("/api/roles/Broker", new
        {
            description = broker.Description,
            capabilities = broker.Capabilities,
            allowedPages = broker.AllowedPages,
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
