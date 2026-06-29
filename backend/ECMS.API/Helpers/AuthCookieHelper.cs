namespace ECMS.API.Helpers;

public static class AuthCookieHelper
{
    public const string AccessCookieName = "ecms_access";

    public static void SetAccessTokenCookie(HttpResponse response, HttpRequest request, string accessToken, DateTime expiresAtUtc)
    {
        response.Cookies.Append(
            AccessCookieName,
            accessToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = request.IsHttps,
                SameSite = request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Path = "/uploads",
                Expires = new DateTimeOffset(expiresAtUtc),
            });
    }

    public static void ClearAccessTokenCookie(HttpResponse response, HttpRequest request)
    {
        response.Cookies.Delete(
            AccessCookieName,
            new CookieOptions
            {
                Path = "/uploads",
                Secure = request.IsHttps,
                SameSite = request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            });
    }
}
