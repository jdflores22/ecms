using ECMS.Domain.Constants;

namespace ECMS.Application;

/// <summary>Empty-return appointment time and ±2h arrival window rules (Philippines local time).</summary>
public static class ScheduleAppointmentRules
{
    public static bool IsLegacyDateOnly(TimeOnly time)
        => time.Hour == 0 && time.Minute == 0 && time.Second == 0;

    public static DateTime GetAppointmentStart(DateOnly date, TimeOnly time)
        => date.ToDateTime(time);

    public static (DateTime WindowStart, DateTime WindowEnd) GetArrivalWindow(DateOnly date, TimeOnly time)
    {
        var appointment = GetAppointmentStart(date, time);
        return (
            appointment.AddHours(-SchedulingConstants.ArrivalGraceHoursEarly),
            appointment.AddHours(SchedulingConstants.ArrivalGraceHoursLate));
    }

    public static bool IsWithinArrivalWindow(DateOnly date, TimeOnly time, DateTime nowPhilippines)
    {
        if (IsLegacyDateOnly(time))
            return true;

        var (windowStart, windowEnd) = GetArrivalWindow(date, time);
        return nowPhilippines >= windowStart && nowPhilippines <= windowEnd;
    }

    public static bool IsPastNoShowCutoff(DateOnly date, TimeOnly time, DateTime nowPhilippines)
    {
        if (IsLegacyDateOnly(time))
            return false;

        var (_, windowEnd) = GetArrivalWindow(date, time);
        return nowPhilippines > windowEnd;
    }

    public static void ValidateEmptyReturnTime(TimeOnly time)
    {
        if (IsLegacyDateOnly(time))
        {
            throw new InvalidOperationException(
                "Return time is required. Choose an hourly slot between 0800 and 1700.");
        }

        if (time.Minute != 0 || time.Second != 0)
        {
            throw new InvalidOperationException("Return time must be on the hour (e.g. 1200).");
        }

        if (time.Hour < SchedulingConstants.OperatingHourStart
            || time.Hour > SchedulingConstants.OperatingHourEnd)
        {
            throw new InvalidOperationException(
                $"Return time must be between {SchedulingConstants.OperatingHourStart:D4} and {SchedulingConstants.OperatingHourEnd:D4}.");
        }
    }

    public static string FormatTimeLabel(TimeOnly time) => $"{time.Hour:D2}{time.Minute:D2}";
}
