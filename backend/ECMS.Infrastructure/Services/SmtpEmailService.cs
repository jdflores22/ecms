using ECMS.Application.Configuration;
using ECMS.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace ECMS.Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailOptions> options, ILogger<SmtpEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogDebug("Email skipped (disabled): {Subject} to {To}", subject, toEmail);
            return;
        }

        if (string.IsNullOrWhiteSpace(_options.Password))
        {
            _logger.LogWarning("Email skipped (SMTP password not configured): {Subject}", subject);
            return;
        }

        if (string.IsNullOrWhiteSpace(toEmail) || !toEmail.Contains('@', StringComparison.Ordinal))
        {
            _logger.LogWarning("Email skipped (invalid recipient): {To}", toEmail);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromDisplayName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail.Trim()));
        message.Subject = subject;

        var body = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = plainTextBody ?? StripHtml(htmlBody),
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient { Timeout = 10_000 };
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(12));
        var sendToken = timeoutCts.Token;

        var secureSocket = _options.UseSsl
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTlsWhenAvailable;

        await client.ConnectAsync(_options.Host, _options.Port, secureSocket, sendToken);
        await client.AuthenticateAsync(_options.UserName, _options.Password, sendToken);
        await client.SendAsync(message, sendToken);
        await client.DisconnectAsync(true, sendToken);

        _logger.LogInformation("Email sent: {Subject} to {To}", subject, toEmail);
    }

    private static string StripHtml(string html)
        => System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ").Trim();
}
