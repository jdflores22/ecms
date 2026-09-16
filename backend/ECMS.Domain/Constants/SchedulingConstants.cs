namespace ECMS.Domain.Constants;

public static class SchedulingConstants
{
    /// <summary>Numbered return slots available per depot per day.</summary>
    public const int MaxSlotsPerDay = 20;

    public const int ArrivalGraceHoursEarly = 2;
    public const int ArrivalGraceHoursLate = 2;

    /// <summary>First bookable hour for empty-return appointments (0800).</summary>
    public const int OperatingHourStart = 8;

    /// <summary>Last bookable hour for empty-return appointments (1700).</summary>
    public const int OperatingHourEnd = 17;

    public const int DefaultContainersPerHour = 3;
}
