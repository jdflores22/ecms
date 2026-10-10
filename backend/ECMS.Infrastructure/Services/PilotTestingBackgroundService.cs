using ECMS.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ECMS.Infrastructure.Services;

/// <summary>Pilot countdown reminders and automatic end-of-pilot payment mode switch.</summary>
public class PilotTestingBackgroundService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(1);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PilotTestingBackgroundService> _logger;

    public PilotTestingBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<PilotTestingBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var settings = scope.ServiceProvider.GetRequiredService<IPaymentSettingsService>();
                await settings.ProcessPilotTestingLifecycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Pilot testing lifecycle job failed.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }
}
