using ECMS.Application;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ECMS.Infrastructure.Services;

/// <summary>Marks confirmed empty-return schedules as No Show after the +2h arrival grace period.</summary>
public class ScheduleNoShowBackgroundService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(5);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduleNoShowBackgroundService> _logger;

    public ScheduleNoShowBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<ScheduleNoShowBackgroundService> logger)
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
                await ProcessNoShowsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Schedule no-show job failed.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task ProcessNoShowsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IEcmsDbContext>();
        var audit = scope.ServiceProvider.GetRequiredService<IAuditService>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = PhilippinesTime.Now;
        var auditUserId = await db.Users
            .Where(u => u.Role.Name == RoleNames.Administrator)
            .OrderBy(u => u.Id)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var candidates = await db.Schedules
            .Include(s => s.PreAdvice)
            .Include(s => s.QRBooking)
            .Where(s =>
                s.Status == ScheduleStatus.Confirmed &&
                s.SlotNo == 0)
            .ToListAsync(cancellationToken);

        var marked = 0;
        foreach (var schedule in candidates)
        {
            if (ScheduleAppointmentRules.IsLegacyDateOnly(schedule.Time))
                continue;

            if (schedule.QRBooking?.GateCheckedInAt is not null)
                continue;

            if (!ScheduleAppointmentRules.IsPastNoShowCutoff(schedule.Date, schedule.Time, now))
                continue;

            schedule.Status = ScheduleStatus.NoShow;
            db.Update(schedule);
            marked++;

            var refNo = schedule.PreAdvice.ReferenceNo;
            if (auditUserId > 0)
            {
                await audit.LogAsync(
                    auditUserId,
                    "AUTO_NO_SHOW",
                    "Schedule",
                    $"{refNo} marked no show — arrival window ended for {schedule.Date:yyyy-MM-dd} {ScheduleAppointmentRules.FormatTimeLabel(schedule.Time)}.",
                    cancellationToken);
            }
            else
            {
                _logger.LogWarning(
                    "Skipping audit log for no-show on {ReferenceNo}; no administrator user found.",
                    refNo);
            }

            var truckerIds = new HashSet<int> { schedule.PreAdvice.TruckerId };
            if (schedule.TruckerId.HasValue)
                truckerIds.Add(schedule.TruckerId.Value);

            await notifications.NotifyUsersAsync(
                truckerIds,
                "Return marked as no show",
                $"{refNo} was marked no show because the trucker did not arrive within the allowed window. File a new pre-forecast to reschedule.",
                "Schedule",
                $"/trucker/returns/{schedule.PreAdviceId}",
                null,
                refNo,
                cancellationToken);
        }

        if (marked > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Marked {Count} schedule(s) as no show.", marked);
        }
    }
}
