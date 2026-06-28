using System.Globalization;
using System.Text.RegularExpressions;
using ECMS.Domain.Common;

namespace ECMS.Infrastructure.Services;

public sealed record PaymentProofMetadata(string? ReferenceNo, DateTime? TransactionAt);

public static class PaymentProofTextParser
{
    private static readonly Regex ReferencePattern = new(
        @"(?:Ref(?:erence)?\.?\s*No\.?|Reference\s*(?:Number|No\.?)|Txn?\s*ID|Transaction\s*ID)\s*[:.]?\s*([0-9][0-9\s\-]{8,})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    // GCash screenshot: "5014 349 566710" (4 + 3 + 6 digits) when label OCR is garbled.
    private static readonly Regex GcashReferenceFallback = new(
        @"\b(\d{4}\s+\d{3}\s+\d{6})\b",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex DateTimePattern = new(
        @"((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly string[] DateTimeFormats =
    {
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
            return new PaymentProofMetadata(null, null);

        var normalized = Regex.Replace(text, @"[ \t]+", " ");
        var referenceNo = ExtractReferenceNo(normalized);
        var transactionAt = ExtractTransactionAt(normalized);
        return new PaymentProofMetadata(referenceNo, transactionAt);
    }

    public static string? NormalizeReferenceNo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var digits = Regex.Replace(value, @"[^\d]", string.Empty);
        if (digits.Length < 8)
            return null;

        return digits.Length <= 64 ? digits : digits[..64];
    }

    public static DateTime? ParseTransactionAt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
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

    private static string? ExtractReferenceNo(string text)
    {
        var match = ReferencePattern.Match(text);
        if (match.Success)
            return NormalizeReferenceNo(match.Groups[1].Value);

        var gcash = GcashReferenceFallback.Match(text);
        if (gcash.Success)
            return NormalizeReferenceNo(gcash.Groups[1].Value);

        return null;
    }

    private static DateTime? ExtractTransactionAt(string text)
    {
        var match = DateTimePattern.Match(text);
        if (!match.Success)
            return null;

        return ParseTransactionAt(match.Groups[1].Value);
    }
}
