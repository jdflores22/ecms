using System.Net;

namespace ECMS.Infrastructure.Email;

internal static class SystemEmailTemplates
{
    public static string Wrap(string title, string bodyHtml, string? footerNote = null)
    {
        var footer = string.IsNullOrWhiteSpace(footerNote)
            ? "This is an automated message from ICS."
            : footerNote;

        return $"""
            <!DOCTYPE html>
            <html>
            <body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#1e293b;max-width:560px;">
              <h2 style="color:#0b3d91;margin:0 0 12px;">{WebUtility.HtmlEncode(title)}</h2>
              {bodyHtml}
              <p style="margin-top:24px;font-size:12px;color:#64748b;">{WebUtility.HtmlEncode(footer)}</p>
            </body>
            </html>
            """;
    }

    public static (string Subject, string Html, string Plain) PasswordReset(string displayName, string resetUrl, int hoursValid)
    {
        var safeName = WebUtility.HtmlEncode(displayName);
        var html = Wrap(
            "Reset your ICS password",
            $"""
              <p>Hello {safeName},</p>
              <p>We received a request to reset your ICS password. Use the button below within {hoursValid} hour(s).</p>
              <p style="margin:24px 0;">
                <a href="{WebUtility.HtmlEncode(resetUrl)}"
                   style="background:#0b3d91;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
                  Reset password
                </a>
              </p>
              <p style="font-size:13px;color:#64748b;">If you did not request this, you can ignore this email.</p>
              <p style="font-size:12px;color:#94a3b8;word-break:break-all;">{WebUtility.HtmlEncode(resetUrl)}</p>
              """);

        var plain =
            $"Hello {displayName},\r\n\r\nReset your ICS password (valid {hoursValid} hour(s)):\r\n{resetUrl}\r\n\r\nIf you did not request this, ignore this email.";

        return ("Reset your ICS password", html, plain);
    }

    public static (string Subject, string Html, string Plain) VerifyEmail(string displayName, string verifyUrl, int hoursValid)
    {
        var safeName = WebUtility.HtmlEncode(displayName);
        var html = Wrap(
            "Verify your ICS email",
            $"""
              <p>Hello {safeName},</p>
              <p>Thanks for signing up. Confirm your email address within {hoursValid} hour(s) to activate your trucker account.</p>
              <p style="margin:24px 0;">
                <a href="{WebUtility.HtmlEncode(verifyUrl)}"
                   style="background:#0b3d91;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
                  Verify email
                </a>
              </p>
              <p style="font-size:13px;color:#64748b;">If you did not create an account, you can ignore this email.</p>
              <p style="font-size:12px;color:#94a3b8;word-break:break-all;">{WebUtility.HtmlEncode(verifyUrl)}</p>
              """);

        var plain =
            $"Hello {displayName},\r\n\r\nVerify your ICS email (valid {hoursValid} hour(s)):\r\n{verifyUrl}\r\n\r\nIf you did not sign up, ignore this email.";

        return ("Verify your ICS email", html, plain);
    }

    public static (string Subject, string Html, string Plain) WelcomeTrucker(string displayName, string username)
    {
        var safeName = WebUtility.HtmlEncode(displayName);
        var safeUser = WebUtility.HtmlEncode(username);
        var html = Wrap(
            "Welcome to ICS",
            $"""
              <p>Hello {safeName},</p>
              <p>Your trucker account is ready. Sign in with username <strong>{safeUser}</strong> to submit pre-forecasts, manage returns, and upload payments.</p>
              """);

        var plain = $"Hello {displayName},\r\n\r\nYour ICS trucker account is ready. Sign in with username: {username}";

        return ("Welcome to ICS", html, plain);
    }

    public static (string Subject, string Html, string Plain) InAppNotification(
        string displayName,
        string title,
        string message,
        string? actionUrl)
    {
        var safeName = WebUtility.HtmlEncode(displayName);
        var safeTitle = WebUtility.HtmlEncode(title);
        var safeMessage = WebUtility.HtmlEncode(message);
        var actionBlock = string.IsNullOrWhiteSpace(actionUrl)
            ? ""
            : $"""
              <p style="margin:20px 0;">
                <a href="{WebUtility.HtmlEncode(actionUrl)}"
                   style="background:#0b3d91;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
                  Open in ICS
                </a>
              </p>
              """;

        var html = Wrap(safeTitle, $"<p>Hello {safeName},</p><p>{safeMessage}</p>{actionBlock}");

        var plain = $"Hello {displayName},\r\n\r\n{title}\r\n{message}";
        if (!string.IsNullOrWhiteSpace(actionUrl))
            plain += $"\r\n\r\n{actionUrl}";

        return (title, html, plain);
    }
}
