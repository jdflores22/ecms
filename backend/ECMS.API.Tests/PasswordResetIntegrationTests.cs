using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class PasswordResetIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _client;

    public PasswordResetIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Password_reset_flow_allows_login_with_new_password()
    {
        const string tempPassword = "ResetTest@456";
        const string originalPassword = "Trucker@123";

        try
        {
            var forgotResponse = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
            {
                emailOrUsername = "trucker1",
            });
            Assert.Equal(HttpStatusCode.OK, forgotResponse.StatusCode);

            var forgot = await forgotResponse.Content.ReadFromJsonAsync<ForgotPasswordResponse>(JsonOptions);
            Assert.NotNull(forgot);
            Assert.False(string.IsNullOrWhiteSpace(forgot.ResetToken));

            var resetResponse = await _client.PostAsJsonAsync("/api/auth/reset-password", new
            {
                token = forgot.ResetToken,
                newPassword = tempPassword,
            });
            Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
            {
                username = "trucker1",
                password = tempPassword,
            });
            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        }
        finally
        {
            var restoreForgot = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
            {
                emailOrUsername = "trucker1",
            });
            var restoreBody = await restoreForgot.Content.ReadFromJsonAsync<ForgotPasswordResponse>(JsonOptions);
            if (!string.IsNullOrWhiteSpace(restoreBody?.ResetToken))
            {
                await _client.PostAsJsonAsync("/api/auth/reset-password", new
                {
                    token = restoreBody.ResetToken,
                    newPassword = originalPassword,
                });
            }
        }
    }

    [Fact]
    public async Task Reset_password_with_invalid_token_returns_bad_request()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            token = "invalid-token",
            newPassword = "NewPassword@123",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Forgot_password_for_unknown_user_returns_generic_success()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/forgot-password", new
        {
            emailOrUsername = $"nobody-{Guid.NewGuid():N}@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ForgotPasswordResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Null(body.ResetToken);
    }

    private record ForgotPasswordResponse(string Message, string? ResetToken);
}
