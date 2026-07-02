using System.Globalization;
using System.Text.RegularExpressions;
using ECMS.Domain.Common;

namespace ECMS.Infrastructure.Services;

public sealed record PaymentProofMetadata(
    string? ReferenceNo,
    string? QrphInvoiceNo,
    DateTime? TransactionAt,
    string? Provider);

public static class PaymentProofTextParser
{
    private static readonly Regex[] QrphInvoicePatterns =
    {
        new(
            @"QR\s*Ph?\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"QRPH\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
    };

    private static readonly Regex[] ReferencePatterns =
    {
        new(
            @"(?:Reference\s+Number|Referencenumber)\s*(?:Transaction\s+Date|Transactiondate)?\s*(UB\d{4,12})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"(UB\d{4,12})",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"Reference\s+ID\s*[:.]?\s*((?:[0-9A-Fa-f]{4}\s*){2,3}[0-9A-Fa-f]{4})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"Reference\s+Number\s*[:.]?\s*(\d{6,12})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"(?:Ref(?:erence)?\.?\s*No\.?)\s*[:.]?\s*(\d{6,12})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"Ref\.?\s*No\.?\s+(\d{6,12})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"\b(\d{4}\s+\d{3}\s+\d{6})\b",
            RegexOptions.Compiled | RegexOptions.CultureInvariant),
    };

    private static readonly Regex[] DatePatterns =
    {
        new(
            @"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm))",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"\b(\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
    };

    private static readonly Regex GluedMeridiemPattern = new(
        @"(\d)(AM|PM)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex ShortDatePattern = new(
        @"^(\d{2})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly string[] DateTimeFormats =
    {
        "MMM dd, yyyy, hh:mm tt",
        "MMM d, yyyy, hh:mm tt",
        "MMM dd, yyyy, h:mm tt",
        "MMM d, yyyy, h:mm tt",
        "MMM dd, yyyy h:mm:ss tt",
        "MMM d, yyyy h:mm:ss tt",
        "MMM dd, yyyy h:mm tt",
        "MMM d, yyyy h:mm tt",
        "MMMM dd, yyyy h:mm tt",
        "MMMM d, yyyy h:mm tt",
        "MM/dd/yyyy h:mm tt",
        "M/d/yyyy h:mm tt",
        "dd/MM/yyyy HH:mm",
        "dd/MM/yyyy h:mm tt",
    };

    public static PaymentProofMetadata Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new PaymentProofMetadata(null, null, null, null);

        var normalized = PreprocessOcrText(text);
        var referenceNo = ExtractReferenceNo(normalized);
        var qrphInvoiceNo = ExtractQrphInvoiceNo(normalized);
        var transactionAt = ExtractTransactionAt(normalized);
        var provider = DetectProvider(normalized);
        return new PaymentProofMetadata(referenceNo, qrphInvoiceNo, transactionAt, provider);
    }

    public static string? DetectProvider(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        return WinnerFromScores(ScoreProviders(PreprocessOcrText(text)));
    }

    private static Dictionary<string, int> ScoreProviders(string t)
    {
        var scores = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["gcash"] = 0,
            ["maya"] = 0,
            ["unionbank"] = 0,
            ["bancnet"] = 0,
            ["grabpay"] = 0,
        };

        if (Regex.IsMatch(t, @"\bmaya\b", RegexOptions.IgnoreCase)) scores["maya"] += 12;
        if (Regex.IsMatch(t, @"paymaya", RegexOptions.IgnoreCase)) scores["maya"] += 12;
        if (Regex.IsMatch(t, @"purchased\s+from", RegexOptions.IgnoreCase)) scores["maya"] += 10;
        if (Regex.IsMatch(t, @"reference\s+id", RegexOptions.IgnoreCase)) scores["maya"] += 9;
        if (Regex.IsMatch(t, @"payment\s+id", RegexOptions.IgnoreCase)) scores["maya"] += 7;
        if (Regex.IsMatch(t, @"merchant\s+id", RegexOptions.IgnoreCase)) scores["maya"] += 5;
        if (Regex.IsMatch(t, @"paid\s+using\s+qr", RegexOptions.IgnoreCase)) scores["maya"] += 6;
        if (Regex.IsMatch(t, @"qr\s*ph\s+invoice\s+no", RegexOptions.IgnoreCase)) scores["maya"] += 4;

        if (Regex.IsMatch(t, @"gcash", RegexOptions.IgnoreCase)) scores["gcash"] += 12;
        if (Regex.IsMatch(t, @"paid\s+via\s+gcash", RegexOptions.IgnoreCase)) scores["gcash"] += 10;
        if (Regex.IsMatch(t, @"sent\s+via\s+gcash", RegexOptions.IgnoreCase)) scores["gcash"] += 10;
        if (Regex.IsMatch(t, @"successful\s+payment\s+via\s+qr", RegexOptions.IgnoreCase)) scores["gcash"] += 6;
        if (Regex.IsMatch(t, @"your\s+payment\s+was\s+successfully\s+processed", RegexOptions.IgnoreCase)) scores["gcash"] += 5;

        if (Regex.IsMatch(t, @"grab\s*pay", RegexOptions.IgnoreCase)) scores["grabpay"] += 12;
        if (Regex.IsMatch(t, @"paid\s+(?:via|using|with)\s+grab", RegexOptions.IgnoreCase)) scores["grabpay"] += 10;

        if (Regex.IsMatch(t, @"transaction\s+details", RegexOptions.IgnoreCase)) scores["unionbank"] += 5;
        if (Regex.IsMatch(t, @"reference\s+number\s+ub\d", RegexOptions.IgnoreCase)) scores["unionbank"] += 15;
        if (Regex.IsMatch(t, @"p2m\s+on\s+us", RegexOptions.IgnoreCase)) scores["unionbank"] += 8;
        if (Regex.IsMatch(t, @"transfer\s+to\s+another\s+unionbank", RegexOptions.IgnoreCase)) scores["unionbank"] += 10;
        if (Regex.IsMatch(t, @"from\s+account", RegexOptions.IgnoreCase)
            && Regex.IsMatch(t, @"to\s+account", RegexOptions.IgnoreCase)) scores["unionbank"] += 6;

        if (Regex.IsMatch(t, @"bancnet", RegexOptions.IgnoreCase)) scores["bancnet"] += 10;
        if (Regex.IsMatch(t, @"payment\s+to\s+bancnet", RegexOptions.IgnoreCase)) scores["bancnet"] += 8;
        if (Regex.IsMatch(t, @"p2m\s+send", RegexOptions.IgnoreCase)) scores["bancnet"] += 10;

        var ewalletStrong = scores["maya"] >= 9 || scores["gcash"] >= 10 || scores["grabpay"] >= 10;
        if (Regex.IsMatch(t, @"bank\s+name", RegexOptions.IgnoreCase)
            && Regex.IsMatch(t, @"union\s*bank", RegexOptions.IgnoreCase))
        {
            if (!ewalletStrong) scores["unionbank"] += 3;
        }
        else if (Regex.IsMatch(t, @"union\s*bank", RegexOptions.IgnoreCase) && !ewalletStrong)
        {
            scores["unionbank"] += 2;
        }

        return scores;
    }

    private static string? WinnerFromScores(Dictionary<string, int> scores)
    {
        var ranked = scores
            .Where(kv => kv.Value >= 5)
            .OrderByDescending(kv => kv.Value)
            .ToList();

        if (ranked.Count == 0)
            return null;

        var top = ranked[0].Value;
        var tied = ranked.Where(kv => kv.Value == top).Select(kv => kv.Key).ToList();
        if (tied.Count == 1)
            return tied[0];

        string[] preference = { "maya", "gcash", "grabpay", "unionbank", "bancnet" };
        foreach (var id in preference)
        {
            if (tied.Contains(id, StringComparer.OrdinalIgnoreCase))
                return id;
        }

        return tied[0];
    }

    public static string? NormalizeProvider(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var key = value.Trim().ToLowerInvariant();
        return key is "gcash" or "maya" or "unionbank" or "bancnet" or "grabpay" ? key : null;
    }

    public static string? NormalizeReferenceNo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var ubDirect = Regex.Match(value, @"(UB\d{4,12})", RegexOptions.IgnoreCase);
        if (ubDirect.Success)
            return ubDirect.Groups[1].Value.ToUpperInvariant();

        var normalized = Regex.Replace(value.Trim().ToUpperInvariant(), @"[^A-Z0-9]", string.Empty);

        var ubEmbedded = Regex.Match(normalized, @"UB\d{4,12}", RegexOptions.IgnoreCase);
        if (ubEmbedded.Success)
            return ubEmbedded.Value.ToUpperInvariant();

        normalized = Regex.Replace(normalized, @"^(?:REFERENCENUMBER|TRANSACTIONDATE|REFERENCENO)+", string.Empty, RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,}$", string.Empty, RegexOptions.IgnoreCase);

        if (normalized.Length < 6)
            return null;

        return normalized.Length <= 64 ? normalized : normalized[..64];
    }

    public static string? NormalizeQrphInvoiceNo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var digits = Regex.Replace(value.Trim(), @"[^\d]", string.Empty);
        if (digits.Length < 4 || digits.Length > 12)
            return null;

        return digits;
    }

    private static string? ExtractQrphInvoiceNo(string text)
    {
        foreach (var pattern in QrphInvoicePatterns)
        {
            var match = pattern.Match(text);
            if (!match.Success)
                continue;

            var normalized = NormalizeQrphInvoiceNo(match.Groups[1].Value);
            if (normalized is not null)
                return normalized;
        }

        return null;
    }

    public static DateTime? ParseTransactionAt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = PreprocessOcrText(value.Trim());
        if (ShortDatePattern.IsMatch(trimmed))
            return ParseShortPhilippinesDateTime(trimmed);

        if (DateTime.TryParseExact(
                trimmed,
                DateTimeFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsed))
        {
            return PhilippinesTime.ToUtcFromPhilippines(parsed);
        }

        if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out parsed))
            return PhilippinesTime.ToUtcFromPhilippines(parsed);

        return null;
    }

    private static string PreprocessOcrText(string text)
    {
        var normalized = Regex.Replace(text, @"[ \t]+", " ");
        normalized = GluedMeridiemPattern.Replace(normalized, "$1 $2");
        return normalized;
    }

    private static string? ExtractReferenceNo(string text)
    {
        foreach (var pattern in ReferencePatterns)
        {
            var match = pattern.Match(text);
            if (!match.Success)
                continue;

            var normalized = NormalizeReferenceNo(match.Groups[1].Value);
            if (normalized is not null)
                return normalized;
        }

        return null;
    }

    private static DateTime? ExtractTransactionAt(string text)
    {
        foreach (var pattern in DatePatterns)
        {
            var match = pattern.Match(text);
            if (!match.Success)
                continue;

            var value = match.Groups[1].Value.Trim();
            if (ShortDatePattern.IsMatch(value))
            {
                var shortDate = ParseShortPhilippinesDateTime(value);
                if (shortDate is not null)
                    return shortDate;
            }
            else
            {
                var parsed = ParseTransactionAt(value);
                if (parsed is not null)
                    return parsed;
            }
        }

        return null;
    }

    private static DateTime? ParseShortPhilippinesDateTime(string raw)
    {
        var match = ShortDatePattern.Match(raw.Trim());
        if (!match.Success)
            return null;

        var month = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var day = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        var year = 2000 + int.Parse(match.Groups[3].Value, CultureInfo.InvariantCulture);
        var hour = int.Parse(match.Groups[4].Value, CultureInfo.InvariantCulture);
        var minute = int.Parse(match.Groups[5].Value, CultureInfo.InvariantCulture);
        var second = int.Parse(match.Groups[6].Value, CultureInfo.InvariantCulture);
        var meridiem = match.Groups[7].Value.ToUpperInvariant();

        if (meridiem == "PM" && hour < 12)
            hour += 12;
        if (meridiem == "AM" && hour == 12)
            hour = 0;

        var local = new DateTime(year, month, day, hour, minute, second, DateTimeKind.Unspecified);
        return PhilippinesTime.ToUtcFromPhilippines(local);
    }
}
