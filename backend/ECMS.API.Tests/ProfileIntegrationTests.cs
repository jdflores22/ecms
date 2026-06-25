using System.Net;
using System.Net.Http.Json;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class ProfileIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ProfileIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_profile_returns_current_user()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, token);

        var response = await _client.GetAsync("/api/profile");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var profile = await response.Content.ReadFromJsonAsync<ProfileResponse>();
        Assert.NotNull(profile);
        Assert.Equal("trucker1", profile.Username);
        Assert.Equal("Trucker", profile.Role);
        Assert.Equal("Active", profile.Status);
    }

    [Fact]
    public async Task Update_profile_changes_name_and_email()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, token);

        var original = await _client.GetFromJsonAsync<ProfileResponse>("/api/profile");
        Assert.NotNull(original);

        var updatedName = $"{original.FullName} Updated";
        var response = await _client.PutAsJsonAsync("/api/profile", new
        {
            email = original.Email,
            fullName = updatedName,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<ProfileResponse>();
        Assert.NotNull(updated);
        Assert.Equal(updatedName, updated.FullName);

        await _client.PutAsJsonAsync("/api/profile", new
        {
            email = original.Email,
            fullName = original.FullName,
        });
    }

    [Fact]
    public async Task Change_password_with_wrong_current_password_fails()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, token);

        var response = await _client.PostAsJsonAsync("/api/profile/change-password", new
        {
            currentPassword = "wrong-password",
            newPassword = "NewPass@123",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Profile_requires_authentication()
    {
        ApiTestHelper.ClearAuth(_client);
        var response = await _client.GetAsync("/api/profile");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private record ProfileResponse(
        int Id,
        string Username,
        string Email,
        string FullName,
        string Role,
        string Status,
        int? ShippingLineId,
        string? ShippingLineName,
        int? DepotId,
        string? DepotName,
        DateTime CreatedAt);
}
