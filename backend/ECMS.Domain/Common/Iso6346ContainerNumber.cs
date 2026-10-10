namespace ECMS.Domain.Common;

/// <summary>ISO 6346 container identification (4 letters + 7 digits, check digit validated).</summary>
public static class Iso6346ContainerNumber
{
    // ISO 6346 letter values (10–38 range with 11, 22, 33 omitted).
    private static readonly int[] LetterValues =
    {
        10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38,
    };

    public static string Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToUpperInvariant().Replace(" ", string.Empty, StringComparison.Ordinal);

    public static bool IsValid(string? value)
    {
        var normalized = Normalize(value);
        if (normalized.Length != 11 || !System.Text.RegularExpressions.Regex.IsMatch(normalized, "^[A-Z]{4}\\d{7}$"))
            return false;

        var sum = 0;
        for (var i = 0; i < 10; i++)
        {
            var ch = normalized[i];
            int n;
            if (ch is >= 'A' and <= 'Z')
            {
                n = LetterValues[ch - 'A'];
            }
            else if (ch is >= '0' and <= '9')
            {
                n = ch - '0';
            }
            else
            {
                return false;
            }

            sum += n * (1 << i);
        }

        var check = sum % 11;
        var expected = check == 10 ? 0 : check;
        return expected == (normalized[10] - '0');
    }

    public static string? GetValidationError(string? value)
    {
        var normalized = Normalize(value);
        if (string.IsNullOrEmpty(normalized)) return null;
        if (normalized.Length != 11)
            return "Container number must be exactly 11 characters (4 letters + 7 digits, ISO 6346).";
        if (!IsValid(normalized))
            return "Invalid container number (ISO 6346 check digit or format).";
        return null;
    }
}
