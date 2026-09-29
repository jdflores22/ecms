using System.Security.Cryptography;
using System.Text;

namespace ECMS.API.Security;

public static class PaymentSettingsDeveloperGate
{
    public static void Validate(IConfiguration configuration, IWebHostEnvironment environment, string? password)
    {
        var expected =
            configuration["PaymentSettings:DeveloperPassword"]
            ?? Environment.GetEnvironmentVariable("ECMS_PAYMENT_SETTINGS_DEV_PASSWORD");

        if (string.IsNullOrWhiteSpace(expected))
        {
            if (environment.IsDevelopment())
                return;

            throw new InvalidOperationException(
                "Payment settings are locked. Configure PaymentSettings:DeveloperPassword or ECMS_PAYMENT_SETTINGS_DEV_PASSWORD on the API server.");
        }

        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Developer password is required to change payment settings.");

        var providedBytes = Encoding.UTF8.GetBytes(password.Trim());
        var expectedBytes = Encoding.UTF8.GetBytes(expected.Trim());
        if (!CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes))
            throw new InvalidOperationException("Invalid developer password.");
    }
}
