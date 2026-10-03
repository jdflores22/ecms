using ECMS.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ECMS.Infrastructure.Services;

/// <summary>
/// Queues outbound mail so HTTP handlers (signup, password reset) are not blocked on SMTP.
/// </summary>
public sealed class BackgroundEmailService : IEmailService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackgroundEmailService> _logger;

    public BackgroundEmailService(IServiceScopeFactory scopeFactory, ILogger<BackgroundEmailService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public Task SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sender = scope.ServiceProvider.GetRequiredService<SmtpEmailService>();
                await sender.SendAsync(toEmail, subject, htmlBody, plainTextBody, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Background email failed: {Subject} to {To}", subject, toEmail);
            }
        }, CancellationToken.None);

        return Task.CompletedTask;
    }
}
