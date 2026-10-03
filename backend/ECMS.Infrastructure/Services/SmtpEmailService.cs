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
            _logger.LogWarning("Email skipped (disabled): {Subject} to {To}", subject, toEmail);
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

        try
        {
            await ConnectSendDisconnectAsync(client, message, _options.Host, _options.Port, secureSocket, sendToken);
        }
        catch (Exception ex) when (_options.Port == 465 && _options.UseSsl)
        {
            _logger.LogWarning(ex, "SMTP SSL on port 465 failed; retrying with STARTTLS on port 587");
            if (client.IsConnected)
                await client.DisconnectAsync(true, sendToken);
            await ConnectSendDisconnectAsync(
                client,
                message,
                _options.Host,
                587,
                SecureSocketOptions.StartTls,
                sendToken);
        }

        _logger.LogInformation("Email sent: {Subject} to {To}", subject, toEmail);
    }

    private async Task ConnectSendDisconnectAsync(
        SmtpClient client,
        MimeMessage message,
        string host,
        int port,
        SecureSocketOptions secureSocket,
        CancellationToken cancellationToken)
    {
        await client.ConnectAsync(host, port, secureSocket, cancellationToken);
        await client.AuthenticateAsync(_options.UserName, _options.Password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }

    private static string StripHtml(string html)
        => System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ").Trim();
}
