using System.Net;
using System.Net.Http.Json;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class AuthIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Theory]
    [InlineData("admin", "Admin@123", "Administrator")]
    [InlineData("broker1", "Broker@123", "Broker")]
    [InlineData("evaluator1", "Evaluator@123", "ShippingLineEvaluator")]
    [InlineData("depot1", "Depot@123", "DepotPersonnel")]
    [InlineData("trucker1", "Trucker@123", "Trucker")]
    public async Task Login_With_demo_accounts_returns_token_and_role(
        string username,
        string password,
        string expectedRole)
    {
        var token = await ApiTestHelper.LoginAsync(_client, username, password);
        Assert.False(string.IsNullOrWhiteSpace(token));

        ApiTestHelper.UseBearer(_client, token);
        var dashboardPath = expectedRole switch
        {
            "Broker" => "/api/dashboard/broker",
            "ShippingLineEvaluator" => "/api/dashboard/shipping-line",
            "DepotPersonnel" => "/api/dashboard/depot",
            "Trucker" => "/api/dashboard/trucker",
            "Administrator" => "/api/dashboard/admin",
            _ => throw new ArgumentOutOfRangeException(nameof(expectedRole)),
        };

        var response = await _client.GetAsync(dashboardPath);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SignUp_broker_creates_account_and_returns_token()
    {
        var username = $"broker_{Guid.NewGuid():N}"[..20];
        var response = await _client.PostAsJsonAsync("/api/auth/signup", new
        {
            username,
            email = $"{username}@example.com",
            password = "Broker@123",
            fullName = "Test Broker",
            role = "Broker",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiTestHelper.AuthResponse>();
        Assert.NotNull(body);
        Assert.Equal("Broker", body.User.Role);
    }

    [Fact]
    public async Task SignUp_trucker_creates_account_and_returns_token()
    {
        var username = $"trucker_{Guid.NewGuid():N}"[..20];
        var response = await _client.PostAsJsonAsync("/api/auth/signup", new
        {
            username,
            email = $"{username}@example.com",
            password = "Trucker@123",
            fullName = "Test Trucker",
            role = "Trucker",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiTestHelper.AuthResponse>();
        Assert.NotNull(body);
        Assert.Equal("Trucker", body.User.Role);
    }

    [Fact]
    public async Task SignUp_admin_role_is_rejected()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/signup", new
        {
            username = $"admin_{Guid.NewGuid():N}"[..20],
            email = "evil@example.com",
            password = "Admin@123",
            fullName = "Evil Admin",
            role = "Administrator",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_With_invalid_password_returns_unauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "admin",
            password = "wrong-password",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Protected_endpoint_without_token_returns_unauthorized()
    {
        ApiTestHelper.ClearAuth(_client);
        var response = await _client.GetAsync("/api/preadvice");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_users_endpoint_denies_broker()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "broker1", "Broker@123");
        ApiTestHelper.UseBearer(_client, token);

        var response = await _client.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_users_endpoint_allows_administrator()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "admin", "Admin@123");
        ApiTestHelper.UseBearer(_client, token);

        var response = await _client.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Shipping_lines_management_denies_broker()
    {
        var token = await ApiTestHelper.LoginAsync(_client, "broker1", "Broker@123");
        ApiTestHelper.UseBearer(_client, token);

        var response = await _client.GetAsync("/api/shipping-lines");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
