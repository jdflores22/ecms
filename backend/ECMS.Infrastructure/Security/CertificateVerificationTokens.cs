using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ECMS.Infrastructure.Security;

public static partial class CertificateVerificationTokens
{
    public const int TokenByteLength = 32;

    [GeneratedRegex(@"^[A-Za-z0-9_-]{43,48}$")]
    private static partial Regex TokenFormatRegex();

    public static string GeneratePlainToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(TokenByteLength);
        return Base64UrlEncode(bytes);
    }

    public static bool IsValidFormat(string? token)
        => !string.IsNullOrWhiteSpace(token) && TokenFormatRegex().IsMatch(token.Trim());

    public static string HashToken(string plainToken, byte[] pepper)
    {
        var normalized = plainToken.Trim();
        using var sha = SHA256.Create();
        var tokenBytes = Encoding.UTF8.GetBytes(normalized);
        var combined = new byte[pepper.Length + tokenBytes.Length];
        Buffer.BlockCopy(pepper, 0, combined, 0, pepper.Length);
        Buffer.BlockCopy(tokenBytes, 0, combined, pepper.Length, tokenBytes.Length);
        return Convert.ToHexString(sha.ComputeHash(combined));
    }

    private static string Base64UrlEncode(byte[] data)
        => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
