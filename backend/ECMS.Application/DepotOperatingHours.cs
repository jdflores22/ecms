namespace ECMS.Application;

/// <summary>Per-depot bookable return hours (inclusive, 0–23).</summary>
public static class DepotOperatingHours
{
    public const int MinHour = 0;
    public const int MaxHour = 23;

    public static void Validate(int operatingHourStart, int operatingHourEnd)
    {
        if (operatingHourStart < MinHour || operatingHourStart > MaxHour
            || operatingHourEnd < MinHour || operatingHourEnd > MaxHour)
        {
            throw new InvalidOperationException("Operating hours must use whole hours from 0000 to 2300.");
        }

        if (operatingHourStart > operatingHourEnd)
        {
            throw new InvalidOperationException("Operating start hour cannot be after the end hour.");
        }
    }

    public static string FormatHourLabel(int hour) => $"{hour:D2}00";

    public static string FormatRangeLabel(int operatingHourStart, int operatingHourEnd) =>
        $"{FormatHourLabel(operatingHourStart)}–{FormatHourLabel(operatingHourEnd)}";
}
