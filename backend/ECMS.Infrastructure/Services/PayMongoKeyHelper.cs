namespace ECMS.Infrastructure.Services;

public static class PayMongoKeyHelper
{
    public static string? Sanitize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var key = value.Trim().Trim('\r', '\n', '\0');
        if ((key.StartsWith('"') && key.EndsWith('"')) || (key.StartsWith('\'') && key.EndsWith('\'')))
            key = key[1..^1].Trim();

        return string.IsNullOrWhiteSpace(key) ? null : key;
    }

    public static void EnsureSecretKey(string secretKey)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            throw new InvalidOperationException("PayMongo secret key is not configured.");

        if (secretKey.StartsWith("pk_", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "PayMongo is misconfigured: PAYMONGO_SECRET_KEY must be the Secret API Key (sk_test_... or sk_live_...), not the Public Key (pk_...).");
        }

        if (!secretKey.StartsWith("sk_test_", StringComparison.Ordinal)
            && !secretKey.StartsWith("sk_live_", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "PayMongo Secret API Key must start with sk_test_ or sk_live_. Copy it from PayMongo Dashboard → Developers → API keys.");
        }
    }
}
