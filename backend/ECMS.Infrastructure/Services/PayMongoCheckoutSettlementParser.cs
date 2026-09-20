using System.Text.Json;
using ECMS.Application.DTOs.Payment;

namespace ECMS.Infrastructure.Services;

public static class PayMongoCheckoutSettlementParser
{
    public static PayMongoSettlementDetails? TryParseCheckoutSession(
        JsonElement checkoutSession,
        string? paymentIntentIdFallback = null)
    {
        if (!checkoutSession.TryGetProperty("attributes", out var attrs))
            return TryFromPaymentIntentIdOnly(paymentIntentIdFallback);

        var intentId = paymentIntentIdFallback;
        if (attrs.TryGetProperty("payment_intent", out var intentEl)
            && intentEl.TryGetProperty("id", out var intentIdEl))
        {
            intentId = intentIdEl.GetString() ?? paymentIntentIdFallback;
        }

        if (attrs.TryGetProperty("payments", out var payments)
            && payments.ValueKind == JsonValueKind.Array
            && payments.GetArrayLength() > 0)
        {
            var best = PickBestPayment(payments);
            if (best is not null)
                return best;
        }

        return TryFromPaymentIntentIdOnly(intentId);
    }

    public static PayMongoSettlementDetails? TryParsePaymentIntent(
        JsonElement paymentIntentRoot,
        string? paymentIntentIdFallback = null)
    {
        if (!paymentIntentRoot.TryGetProperty("data", out var data))
            return TryFromPaymentIntentIdOnly(paymentIntentIdFallback);

        var intentId = data.TryGetProperty("id", out var idEl) ? idEl.GetString() : paymentIntentIdFallback;
        if (!data.TryGetProperty("attributes", out var attrs))
            return TryFromPaymentIntentIdOnly(intentId);

        if (attrs.TryGetProperty("payments", out var payments)
            && payments.ValueKind == JsonValueKind.Array
            && payments.GetArrayLength() > 0)
        {
            var best = PickBestPayment(payments);
            if (best is not null)
                return best with { PaymentId = best.PaymentId ?? intentId };
        }

        return TryFromPaymentIntentIdOnly(intentId);
    }

    private static PayMongoSettlementDetails? PickBestPayment(JsonElement payments)
    {
        PayMongoSettlementDetails? paid = null;
        foreach (var payment in payments.EnumerateArray())
        {
            var parsed = ParsePaymentElement(payment);
            if (parsed is null)
                continue;
            if (parsed.PaidAtUtc is not null)
                return parsed;
            paid ??= parsed;
        }

        return paid;
    }

    private static PayMongoSettlementDetails? ParsePaymentElement(JsonElement payment)
    {
        var payId = payment.TryGetProperty("id", out var payIdEl) ? payIdEl.GetString() : null;
        if (!payment.TryGetProperty("attributes", out var attrs))
            return null;

        var status = attrs.TryGetProperty("status", out var statusEl) ? statusEl.GetString() : null;
        if (!string.Equals(status, "paid", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(status, "succeeded", StringComparison.OrdinalIgnoreCase))
        {
            // Still parse type/reference for in-flight sessions when status missing.
            if (!string.IsNullOrWhiteSpace(status)
                && !string.Equals(status, "processing", StringComparison.OrdinalIgnoreCase))
                return null;
        }

        var provider = MapProvider(attrs);
        var reference = ReadString(attrs, "external_reference_number")
            ?? ReadString(attrs, "reference_number")
            ?? FormatPayMongoId(payId);

        var qrph = ReadQrphInvoice(attrs);
        var paidAt = ReadPaidAt(attrs);

        if (reference is null && payId is null && provider is null)
            return null;

        return new PayMongoSettlementDetails(
            reference,
            payId ?? reference,
            qrph,
            paidAt,
            provider);
    }

    private static string? ReadQrphInvoice(JsonElement attrs)
    {
        if (!attrs.TryGetProperty("source", out var source))
            return null;

        return ReadString(source, "provider_id")
            ?? ReadString(source, "id");
    }

    private static DateTime? ReadPaidAt(JsonElement attrs)
    {
        if (!attrs.TryGetProperty("paid_at", out var paidAtEl))
            return null;

        if (paidAtEl.ValueKind == JsonValueKind.Number && paidAtEl.TryGetInt64(out var unix))
            return DateTimeOffset.FromUnixTimeSeconds(unix).UtcDateTime;

        if (paidAtEl.ValueKind == JsonValueKind.String
            && long.TryParse(paidAtEl.GetString(), out var unixFromString))
            return DateTimeOffset.FromUnixTimeSeconds(unixFromString).UtcDateTime;

        return null;
    }

    private static string? MapProvider(JsonElement attrs)
    {
        var raw = ReadString(attrs, "type");
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        return raw.Trim().ToLowerInvariant() switch
        {
            "gcash" => "gcash",
            "paymaya" or "maya" => "maya",
            "grab_pay" or "grabpay" => "grabpay",
            "qrph" => "gcash",
            "card" => "card",
            _ => PaymentProofTextParser.NormalizeProvider(raw),
        };
    }

    private static string? ReadString(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value))
            return null;
        var s = value.GetString();
        return string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    }

    private static string? FormatPayMongoId(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;
        return id.StartsWith("pay_", StringComparison.OrdinalIgnoreCase)
            ? id[4..].ToUpperInvariant()
            : id;
    }

    private static PayMongoSettlementDetails? TryFromPaymentIntentIdOnly(string? paymentIntentId)
    {
        if (string.IsNullOrWhiteSpace(paymentIntentId))
            return null;

        var reference = paymentIntentId.StartsWith("pi_", StringComparison.OrdinalIgnoreCase)
            ? paymentIntentId[3..].ToUpperInvariant()
            : paymentIntentId;

        return new PayMongoSettlementDetails(reference, paymentIntentId, null, null, null);
    }
}
