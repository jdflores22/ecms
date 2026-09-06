using ECMS.Domain.Enums;

namespace ECMS.Application;

/// <summary>
/// Trucker-facing schedule detail visibility — dates are hidden until CY confirms and payment is verified.
/// </summary>
public static class TruckerScheduleVisibility
{
    public const string AwaitingCyConfirmation =
        "Awaiting Container Yard to confirm the date of return";

    public const string AwaitingPayment =
        "Upload payment proof to view your confirmed return schedule";

    public static (bool DetailsVisible, string? StatusHint) Resolve(ScheduleStatus status) =>
        status switch
        {
            ScheduleStatus.WaitingSchedule => (false, AwaitingCyConfirmation),
            ScheduleStatus.Scheduled => (false, AwaitingPayment),
            _ => (true, null),
        };
}
