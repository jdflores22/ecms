using System.Text.Json;
using System.Text.RegularExpressions;
using ECMS.Application.DTOs.QR;

namespace ECMS.Application;

public static partial class BookingQrReference
{
    public static string? Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        var trimmed = raw.Trim();

        if (trimmed.StartsWith("{", StringComparison.Ordinal))
        {
            try
            {
                var payload = JsonSerializer.Deserialize<QrPayloadDto>(trimmed);
                if (!string.IsNullOrWhiteSpace(payload?.BookingId))
                    return payload.BookingId.Trim().ToUpperInvariant();
            }
            catch (JsonException)
            {
                // Fall through to plain reference parsing.
            }
        }

        var icsMatch = IcsReferenceRegex().Match(trimmed);
        if (icsMatch.Success)
            return icsMatch.Value.ToUpperInvariant();

        return trimmed;
    }

    [GeneratedRegex(@"ICS-\d+", RegexOptions.IgnoreCase)]
    private static partial Regex IcsReferenceRegex();
}
