using System.Globalization;
using System.Text.RegularExpressions;
using ECMS.Domain.Common;

namespace ECMS.Infrastructure.Services;

public sealed record PaymentProofMetadata(
    string? ReferenceNo,
    string? PaymentId,
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
        new(
            @"Invoice\s*No\.?\s*[:.]?\s*(\d{4,8})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"(?:QR\s*Ph?|QRPH)[^\d]{0,24}(\d{6})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
    };

    private static readonly Regex[] PaymentIdPatterns =
    {
        new(
            @"Payment\s+ID\s*[:.]?\s*((?:[0-9A-Fa-f]{4}\s*){2,3}[0-9A-Fa-f]{4})\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"Payment\s+ID\s*[:.]?\s*([0-9A-Fa-f]{10,16})\b",
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
        new(
            @"\b(\d{3}\s+\d{3}\s+\d{3})\b",
            RegexOptions.Compiled | RegexOptions.CultureInvariant),
    };

    private static readonly Regex[] DatePatterns =
    {
        new(
            @"\bDate\b\s*[:.]?\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[^\n]{6,40})",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|eM|pM|pn))",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|eM|pM|pn))",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"\b(\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM|eM|pM))\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"\b(\d{1,2}[/.-]\d{1,2}[/.-]20\d{2}\s+\d{1,2}\s*:\s*\d{2}\s*(?:AM|PM|am|pm|eM|pM|pn))",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
        new(
            @"\b(20\d{2}[/.-]\d{1,2}[/.-]\d{1,2}\s+\d{1,2}\s*:\s*\d{2}\s*(?:AM|PM|am|pm|eM|pM|pn))",
            RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant),
    };

    private static readonly Regex MonthFragmentPattern = new(
        @"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b\.?\s+(\d{1,2}),?\s+(20\d{2})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex TimeFragmentPattern = new(
        @"\b(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

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
            return new PaymentProofMetadata(null, null, null, null, null);

        var normalized = PreprocessOcrText(text);
        var referenceNo = ExtractReferenceNo(normalized);
        var paymentId = ExtractPaymentId(normalized);
        var qrphInvoiceNo = ExtractQrphInvoiceNo(normalized);
        var transactionAt = ExtractTransactionAt(normalized);
        var provider = DetectProvider(normalized);
        return new PaymentProofMetadata(referenceNo, paymentId, qrphInvoiceNo, transactionAt, provider);
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
        if (Regex.IsMatch(t, @"\bpayment\b", RegexOptions.IgnoreCase)
            && Regex.IsMatch(t, @"transnetsoftwaredevelop", RegexOptions.IgnoreCase)) scores["gcash"] += 8;
        if (Regex.IsMatch(t, @"\bqrph\b", RegexOptions.IgnoreCase)
            && Regex.IsMatch(t, @"invoice", RegexOptions.IgnoreCase)) scores["gcash"] += 4;

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

    public static string? NormalizePaymentId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = Regex.Replace(value.Trim().ToUpperInvariant(), @"[^A-Z0-9]", string.Empty);
        if (normalized.Length < 10 || normalized.Length > 16)
            return null;

        if (!Regex.IsMatch(normalized, @"^[0-9A-F]+$", RegexOptions.CultureInvariant))
            return null;

        return normalized;
    }

    public static string? NormalizeQrphInvoiceNo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var digits = Regex.Replace(value.Trim(), @"[^\d]", string.Empty);
        if (digits.Length == 7 && digits.EndsWith("0", StringComparison.Ordinal))
            digits = digits[..6];
        if (digits.Length < 4 || digits.Length > 12)
            return null;

        return digits;
    }

    private static readonly Regex NineDigitTokenPattern = new(
        @"(?:^|[^\d])(\d{9})(?:[^\d]|$)",
        RegexOptions.Multiline | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex SixDigitTokenPattern = new(
        @"(?:^|[^\d])(\d{6})(?:[^\d]|$)",
        RegexOptions.Multiline | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static bool IsGcashPaymentScreenContext(string text)
    {
        var scores = ScoreProviders(text);
        return scores["gcash"] >= 8
            || (Regex.IsMatch(text, @"\bpayment\b", RegexOptions.IgnoreCase)
                && Regex.IsMatch(text, @"transnetsoftwaredevelop", RegexOptions.IgnoreCase))
            || Regex.IsMatch(text, @"paid\s+via\s+gcash", RegexOptions.IgnoreCase);
    }

    private static (string? ReferenceNo, string? QrphInvoiceNo) ExtractGcashNumericFallback(string text)
    {
        if (!IsGcashPaymentScreenContext(text))
            return (null, null);

        var nineDigitRefs = NineDigitTokenPattern.Matches(text)
            .Select(m => m.Groups[1].Value)
            .ToList();
        var sixDigitInvoices = SixDigitTokenPattern.Matches(text)
            .Select(m => m.Groups[1].Value)
            .ToList();

        string? referenceNo = null;
        foreach (var digits in nineDigitRefs)
        {
            var normalized = NormalizeReferenceNo(digits);
            if (normalized is not null)
            {
                referenceNo = normalized;
                break;
            }
        }

        referenceNo ??= nineDigitRefs.Count > 0 ? NormalizeReferenceNo(nineDigitRefs[0]) : null;
        var refDigits = referenceNo is not null
            ? Regex.Replace(referenceNo, @"[^\d]", string.Empty)
            : string.Empty;

        string? qrphInvoiceNo = null;
        foreach (var digits in sixDigitInvoices)
        {
            if (!string.IsNullOrEmpty(refDigits) && refDigits.Contains(digits, StringComparison.Ordinal))
                continue;

            var normalized = NormalizeQrphInvoiceNo(digits);
            if (normalized is not null)
            {
                qrphInvoiceNo = normalized;
                break;
            }
        }

        return (referenceNo, qrphInvoiceNo);
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

        return ExtractGcashNumericFallback(text).QrphInvoiceNo;
    }

    private static string FixOcrDateText(string text)
    {
        var fixedText = text;
        fixedText = Regex.Replace(fixedText, @"\b(?:D|0)ate\b", "Date", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\blun\b", "Jun", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\biun\b", "Jun", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\b0un\b", "Jun", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\b3un\b", "Jun", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\bJnn\b", "Jun", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\bJu\s*n\b", "Jun", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\bMav\b", "May", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\bFe6\b", "Feb", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"(\d)\s*[oO]\s*(\d)", "$1:$2");
        fixedText = Regex.Replace(fixedText, @"(20)\s*[oO]\s*(\d{2})", "$1$2");
        fixedText = Regex.Replace(fixedText, @"\b(\d{1,2})\s*:\s*(\d{2})\s*eM\b", "$1:$2 PM", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\b(\d{1,2})\s*:\s*(\d{2})\s*pn\b", "$1:$2 PM", RegexOptions.IgnoreCase);
        fixedText = Regex.Replace(fixedText, @"\b(\d{1,2})\s*:\s*(\d{2})\s*pM\b", "$1:$2 PM");
        fixedText = Regex.Replace(fixedText, @"\b(\d{1,2})\s*:\s*(\d{2})\s*aM\b", "$1:$2 AM");
        return fixedText;
    }

    private static string NormalizeMeridiem(string value)
    {
        var upper = value.ToUpperInvariant();
        return upper is "EM" or "PN" or "PM" ? "PM" : upper is "AM" ? "AM" : value;
    }

    private static int ApplyMeridiem(int hour, string meridiem)
    {
        var mer = NormalizeMeridiem(meridiem);
        if (mer == "PM" && hour < 12) return hour + 12;
        if (mer == "AM" && hour == 12) return 0;
        return hour;
    }

    private static DateTime? ExtractTransactionAtFromFragments(string text)
    {
        var fixedText = FixOcrDateText(text);
        var monthMatch = MonthFragmentPattern.Match(fixedText);
        var timeMatch = TimeFragmentPattern.Match(fixedText);

        if (monthMatch.Success && timeMatch.Success)
        {
            if (!DateTime.TryParseExact(
                    monthMatch.Groups[1].Value,
                    new[] { "MMM", "MMMM" },
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var monthDate))
                return null;

            var day = int.Parse(monthMatch.Groups[2].Value, CultureInfo.InvariantCulture);
            var year = int.Parse(monthMatch.Groups[3].Value, CultureInfo.InvariantCulture);
            var hour = ApplyMeridiem(
                int.Parse(timeMatch.Groups[1].Value, CultureInfo.InvariantCulture),
                timeMatch.Groups[3].Value);
            var minute = int.Parse(timeMatch.Groups[2].Value, CultureInfo.InvariantCulture);
            var local = new DateTime(year, monthDate.Month, day, hour, minute, 0, DateTimeKind.Unspecified);
            return PhilippinesTime.ToUtcFromPhilippines(local);
        }

        if (monthMatch.Success && !timeMatch.Success)
        {
            var statusOnly = ExtractStatusBarTime(fixedText);
            if (statusOnly is not null
                && DateTime.TryParseExact(
                    monthMatch.Groups[1].Value,
                    new[] { "MMM", "MMMM" },
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var monthOnlyDate))
            {
                var statusHourOnly = ApplyMeridiem(statusOnly.Value.Hour, statusOnly.Value.Meridiem);
                var statusOnlyLocal = new DateTime(
                    int.Parse(monthMatch.Groups[3].Value, CultureInfo.InvariantCulture),
                    monthOnlyDate.Month,
                    int.Parse(monthMatch.Groups[2].Value, CultureInfo.InvariantCulture),
                    statusHourOnly,
                    statusOnly.Value.Minute,
                    0,
                    DateTimeKind.Unspecified);
                return PhilippinesTime.ToUtcFromPhilippines(statusOnlyLocal);
            }
        }

        var dayYearMatch = Regex.Match(fixedText, @"\b(\d{1,2})\s*,\s*(20[2-9]\d)\b");
        if (!dayYearMatch.Success)
            dayYearMatch = Regex.Match(fixedText, @"\b(\d{1,2})\s+(20[2-9]\d)\b");

        if (!dayYearMatch.Success || !timeMatch.Success)
            return null;

        var fragmentDay = int.Parse(dayYearMatch.Groups[1].Value, CultureInfo.InvariantCulture);
        var fragmentYear = int.Parse(dayYearMatch.Groups[2].Value, CultureInfo.InvariantCulture);
        int? fragmentMonth = null;
        if (monthMatch.Success
            && DateTime.TryParseExact(
                monthMatch.Groups[1].Value,
                new[] { "MMM", "MMMM" },
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsedMonth))
        {
            fragmentMonth = parsedMonth.Month;
        }
        else
        {
            var start = Math.Max(0, dayYearMatch.Index - 48);
            var window = fixedText.Substring(start, dayYearMatch.Index - start);
            var nearMonth = Regex.Match(
                window,
                @"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b",
                RegexOptions.IgnoreCase);
            if (nearMonth.Success
                && DateTime.TryParseExact(
                    nearMonth.Groups[1].Value,
                    new[] { "MMM", "MMMM" },
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out parsedMonth))
            {
                fragmentMonth = parsedMonth.Month;
            }
        }

        if (fragmentMonth is null)
        {
            var statusBar = ExtractStatusBarTime(fixedText);
            if (statusBar is not null && monthMatch.Success
                && DateTime.TryParseExact(
                    monthMatch.Groups[1].Value,
                    new[] { "MMM", "MMMM" },
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var monthOnly))
            {
                var statusHour = ApplyMeridiem(statusBar.Value.Hour, statusBar.Value.Meridiem);
                var statusLocal = new DateTime(
                    int.Parse(monthMatch.Groups[3].Value, CultureInfo.InvariantCulture),
                    monthOnly.Month,
                    int.Parse(monthMatch.Groups[2].Value, CultureInfo.InvariantCulture),
                    statusHour,
                    statusBar.Value.Minute,
                    0,
                    DateTimeKind.Unspecified);
                return PhilippinesTime.ToUtcFromPhilippines(statusLocal);
            }

            return null;
        }

        var fragmentHour = ApplyMeridiem(
            int.Parse(timeMatch.Groups[1].Value, CultureInfo.InvariantCulture),
            timeMatch.Groups[3].Value);
        var fragmentMinute = int.Parse(timeMatch.Groups[2].Value, CultureInfo.InvariantCulture);
        var fragmentLocal = new DateTime(
            fragmentYear,
            fragmentMonth.Value,
            fragmentDay,
            fragmentHour,
            fragmentMinute,
            0,
            DateTimeKind.Unspecified);
        return PhilippinesTime.ToUtcFromPhilippines(fragmentLocal);
    }

    public static DateTime? ParseTransactionAt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = FixOcrDateText(PreprocessOcrText(value.Trim()));
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

        return ExtractGcashNumericFallback(text).ReferenceNo;
    }

    private static string? ExtractPaymentId(string text)
    {
        foreach (var pattern in PaymentIdPatterns)
        {
            var match = pattern.Match(text);
            if (!match.Success)
                continue;

            var normalized = NormalizePaymentId(match.Groups[1].Value);
            if (normalized is not null)
                return normalized;
        }

        return null;
    }

    private static (int Hour, int Minute, string Meridiem)? ExtractStatusBarTime(string text)
    {
        var head = text.Length <= 500 ? text : text[..500];
        var match = Regex.Match(
            head,
            @"\b(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)?\b",
            RegexOptions.IgnoreCase);
        if (!match.Success)
            return null;

        var hour = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var minute = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        if (hour > 12 || minute > 59)
            return null;

        var meridiem = match.Groups[3].Success
            ? NormalizeMeridiem(match.Groups[3].Value)
            : hour is >= 7 and <= 11 ? "AM" : "PM";
        return (hour, minute, meridiem);
    }

    private static DateTime? ParseSlashDateTime(string raw)
    {
        var cleaned = FixOcrDateText(raw.Trim());
        var dmy = Regex.Match(
            cleaned,
            @"^(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\s+(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)",
            RegexOptions.IgnoreCase);
        if (dmy.Success)
        {
            var hour = ApplyMeridiem(
                int.Parse(dmy.Groups[4].Value, CultureInfo.InvariantCulture),
                dmy.Groups[6].Value);
            var local = new DateTime(
                int.Parse(dmy.Groups[3].Value, CultureInfo.InvariantCulture),
                int.Parse(dmy.Groups[2].Value, CultureInfo.InvariantCulture),
                int.Parse(dmy.Groups[1].Value, CultureInfo.InvariantCulture),
                hour,
                int.Parse(dmy.Groups[5].Value, CultureInfo.InvariantCulture),
                0,
                DateTimeKind.Unspecified);
            return PhilippinesTime.ToUtcFromPhilippines(local);
        }

        var ymd = Regex.Match(
            cleaned,
            @"^(20\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\s+(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM|am|pm|eM|pM|pn)",
            RegexOptions.IgnoreCase);
        if (!ymd.Success)
            return null;

        var ymdHour = ApplyMeridiem(
            int.Parse(ymd.Groups[4].Value, CultureInfo.InvariantCulture),
            ymd.Groups[6].Value);
        var ymdLocal = new DateTime(
            int.Parse(ymd.Groups[1].Value, CultureInfo.InvariantCulture),
            int.Parse(ymd.Groups[2].Value, CultureInfo.InvariantCulture),
            int.Parse(ymd.Groups[3].Value, CultureInfo.InvariantCulture),
            ymdHour,
            int.Parse(ymd.Groups[5].Value, CultureInfo.InvariantCulture),
            0,
            DateTimeKind.Unspecified);
        return PhilippinesTime.ToUtcFromPhilippines(ymdLocal);
    }

    private static DateTime? ExtractTransactionAt(string text)
    {
        var fixedText = FixOcrDateText(PreprocessOcrText(text));
        foreach (var pattern in DatePatterns)
        {
            var match = pattern.Match(fixedText);
            if (!match.Success)
                continue;

            var value = match.Groups[1].Value.Trim();
            if (ShortDatePattern.IsMatch(value))
            {
                var shortDate = ParseShortPhilippinesDateTime(value);
                if (shortDate is not null)
                    return shortDate;
            }
            else if (Regex.IsMatch(value, @"[/.-]") && Regex.IsMatch(value, @"\d{4}"))
            {
                var slashDate = ParseSlashDateTime(value);
                if (slashDate is not null)
                    return slashDate;
            }
            else
            {
                var parsed = ParseTransactionAt(value);
                if (parsed is not null)
                    return parsed;
            }
        }

        return ExtractTransactionAtFromFragments(fixedText);
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

    public static PaymentProofMetadata ParseTexts(IEnumerable<(string Text, int Weight)> passes)
    {
        var passList = passes
            .Where(p => !string.IsNullOrWhiteSpace(p.Text))
            .Select(p => (Text: p.Text.Trim(), p.Weight))
            .ToList();
        if (passList.Count == 0)
            return new PaymentProofMetadata(null, null, null, null, null);

        var texts = passList.Select(p => p.Text).ToList();
        texts.Add(string.Join("\n", texts));
        var weights = passList.Select(p => p.Weight).ToList();
        weights.Add(weights.Count > 0 ? weights.Max() + 2 : 10);

        string? bestRef = null, bestPaymentId = null, bestQrph = null, bestProvider = null;
        DateTime? bestDate = null;
        var bestRefScore = -1;
        var bestPaymentIdScore = -1;
        var bestQrphScore = -1;
        var bestDateScore = -1;
        var bestProviderScore = -1;

        for (var i = 0; i < texts.Count; i++)
        {
            var weight = i < weights.Count ? weights[i] : 8;
            var normalized = PreprocessOcrText(texts[i]);
            var parsed = Parse(texts[i]);

            if (parsed.ReferenceNo is not null)
            {
                var score = weight + ScoreReference(parsed.ReferenceNo, normalized);
                if (score > bestRefScore)
                {
                    bestRefScore = score;
                    bestRef = parsed.ReferenceNo;
                }
            }

            if (parsed.PaymentId is not null)
            {
                var score = weight + ScorePaymentId(parsed.PaymentId, normalized);
                if (score > bestPaymentIdScore)
                {
                    bestPaymentIdScore = score;
                    bestPaymentId = parsed.PaymentId;
                }
            }

            if (parsed.QrphInvoiceNo is not null)
            {
                var score = weight + ScoreQrph(parsed.QrphInvoiceNo, normalized);
                if (score > bestQrphScore)
                {
                    bestQrphScore = score;
                    bestQrph = parsed.QrphInvoiceNo;
                }
            }

            if (parsed.TransactionAt is not null)
            {
                var score = weight + ScoreTransactionAt(parsed.TransactionAt.Value, normalized);
                if (score > bestDateScore)
                {
                    bestDateScore = score;
                    bestDate = parsed.TransactionAt;
                }
            }

            if (parsed.Provider is not null)
            {
                var providerScores = ScoreProviders(normalized);
                var score = weight + (providerScores.GetValueOrDefault(parsed.Provider, 0));
                if (score > bestProviderScore)
                {
                    bestProviderScore = score;
                    bestProvider = parsed.Provider;
                }
            }
        }

        var merged = string.Join("\n", passList.Select(p => p.Text));
        return new PaymentProofMetadata(
            bestRef,
            bestPaymentId,
            bestQrph,
            bestDate,
            bestProvider ?? DetectProvider(merged));
    }

    /// <summary>
    /// Use payment receipt upload time when OCR cannot read the printed transaction date.
    /// </summary>
    public static DateTime? ResolveReceiptDateFallback(PaymentProofMetadata parsed, DateTime? paidAt)
    {
        if (parsed.TransactionAt is not null)
            return parsed.TransactionAt;
        if (paidAt is null)
            return null;
        if (!HasProofEvidence(parsed))
            return null;
        return paidAt;
    }

    private static bool HasProofEvidence(PaymentProofMetadata parsed) =>
        parsed.ReferenceNo is not null
        || parsed.PaymentId is not null
        || parsed.QrphInvoiceNo is not null
        || parsed.Provider is not null;

    private static int ScoreReference(string value, string text)
    {
        var score = 0;
        if (Regex.IsMatch(text, @"ref(?:erence)?\.?\s*no", RegexOptions.IgnoreCase)) score += 14;
        if (Regex.IsMatch(text, @"reference\s+number", RegexOptions.IgnoreCase)) score += 12;
        if (value.StartsWith("UB", StringComparison.OrdinalIgnoreCase)) score += 16;
        var digits = Regex.Replace(value, @"\D", "");
        if (digits.Length == 9) score += 4;
        return score;
    }

    private static int ScorePaymentId(string value, string text)
    {
        var score = 0;
        if (Regex.IsMatch(text, @"payment\s+id", RegexOptions.IgnoreCase)) score += 16;
        if (value.Length is >= 10 and <= 16) score += 4;
        return score;
    }

    private static int ScoreQrph(string value, string text)
    {
        var score = 0;
        if (Regex.IsMatch(text, @"qr\s*ph?\s*invoice", RegexOptions.IgnoreCase)) score += 14;
        if (value.Length == 6) score += 5;
        return score;
    }

    private static int ScoreTransactionAt(DateTime iso, string text)
    {
        var score = 0;
        if (Regex.IsMatch(text, @"\bdate\b", RegexOptions.IgnoreCase)) score += 12;
        if (Regex.IsMatch(text, @"transaction\s+date", RegexOptions.IgnoreCase)) score += 8;
        if (Regex.IsMatch(text, @"\bdate\b", RegexOptions.IgnoreCase)
            && Regex.IsMatch(text, @"reference\s+no", RegexOptions.IgnoreCase)) score += 10;
        var year = iso.Year;
        var nowYear = DateTime.UtcNow.Year;
        if (year >= nowYear - 1 && year <= nowYear + 1) score += 4;
        return score;
    }
}
