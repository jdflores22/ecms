namespace ECMS.Domain.Common;

/// <summary>
/// Single source of truth for ECMS business time — Philippines Standard Time (UTC+8, no DST).
/// Store timestamps as UTC; use <see cref="Now"/> / <see cref="Today"/> for business rules and display conversion.
/// </summary>
public static class PhilippinesTime
{
    public static TimeZoneInfo Zone { get; } = ResolveZone();

    public static DateTime UtcNow => DateTime.UtcNow;

    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(UtcNow, Zone);

    public static DateOnly Today => DateOnly.FromDateTime(Now);

    public static int Year => Now.Year;

    public static DateOnly ToDateOnly(DateTime value)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, Zone));
    }

    public static DateOnly AddDays(DateOnly date, int days) => date.AddDays(days);

    private static TimeZoneInfo ResolveZone()
    {
        foreach (var id in new[] { "Asia/Manila", "Singapore Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("UTC+08", TimeSpan.FromHours(8), "Philippines", "Philippines");
    }
}
