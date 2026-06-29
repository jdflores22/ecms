using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ECMS.Infrastructure.Security;
using Microsoft.IdentityModel.Tokens;

namespace ECMS.API.Middleware;

/// <summary>
/// Protects /uploads: requires a valid JWT (header or cookie) or a signed URL (for LOGICTECK dossier links).
/// </summary>
public class UploadAccessMiddleware
{
    private const string AccessCookieName = "ecms_access";
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;

    public UploadAccessMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, IUploadUrlSigner uploadUrlSigner)
    {
        if (!context.Request.Path.StartsWithSegments("/uploads", out var uploadsPath))
        {
            await _next(context);
            return;
        }

        var relativePath = $"/uploads{uploadsPath.Value?.Replace('\\', '/') ?? string.Empty}";
        var expRaw = context.Request.Query["exp"].ToString();
        var sig = context.Request.Query["sig"].ToString();

        if (long.TryParse(expRaw, out var expUnix)
            && uploadUrlSigner.TryValidateSignedRequest(relativePath, expUnix, sig))
        {
            await _next(context);
            return;
        }

        var token = ExtractBearerToken(context);
        if (token is not null && TryValidateJwt(token))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
    }

    private static string? ExtractBearerToken(HttpContext context)
    {
        var header = context.Request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return header["Bearer ".Length..].Trim();

        if (context.Request.Cookies.TryGetValue(AccessCookieName, out var cookie) && !string.IsNullOrWhiteSpace(cookie))
            return cookie;

        return null;
    }

    private bool TryValidateJwt(string token)
    {
        var jwtKey = _configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey))
            return false;

        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _configuration["Jwt:Issuer"],
            ValidAudience = _configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = ClaimTypes.Role,
            ClockSkew = TimeSpan.FromMinutes(1),
        };

        try
        {
            new JwtSecurityTokenHandler().ValidateToken(token, parameters, out _);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
