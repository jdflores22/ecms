using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace ECMS.Infrastructure.Security;

public interface IUploadUrlSigner
{
    string SignRelativePath(string relativePath, TimeSpan ttl);
    bool TryValidateSignedRequest(string relativePath, long expUnix, string sig);
}

public class UploadUrlSigner : IUploadUrlSigner
{
    private readonly byte[] _keyBytes;

    public UploadUrlSigner(IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is required for upload URL signing.");
        _keyBytes = Encoding.UTF8.GetBytes(key);
    }

    public string SignRelativePath(string relativePath, TimeSpan ttl)
    {
        var normalized = NormalizeRelativePath(relativePath);
        var exp = DateTimeOffset.UtcNow.Add(ttl).ToUnixTimeSeconds();
        var sig = ComputeSignature(normalized, exp);
        return $"{normalized}?exp={exp}&sig={sig}";
    }

    public bool TryValidateSignedRequest(string relativePath, long expUnix, string sig)
    {
        if (string.IsNullOrWhiteSpace(sig))
            return false;

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expUnix)
            return false;

        var normalized = NormalizeRelativePath(relativePath);
        var expected = ComputeSignature(normalized, expUnix);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(sig));
    }

    private string ComputeSignature(string relativePath, long expUnix)
    {
        var payload = $"{relativePath}|{expUnix}";
        using var hmac = new HMACSHA256(_keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static string NormalizeRelativePath(string relativePath)
    {
        var path = relativePath.Trim();
        if (!path.StartsWith('/'))
            path = $"/{path}";
        return path;
    }
}
