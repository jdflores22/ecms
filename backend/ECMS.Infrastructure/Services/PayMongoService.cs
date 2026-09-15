using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ECMS.Application.Configuration;
using ECMS.Application.DTOs.Payment;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using ECMS.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class PayMongoService : IPayMongoService
{
    private const string ApiBase = "https://api.paymongo.com/v1";
    private static readonly string[] CheckoutPaymentMethodTypes = { "card", "gcash", "paymaya", "qrph" };

    private readonly IEcmsDbContext _db;
    private readonly IPaymentSettingsService _paymentSettings;
    private readonly IShippingLinePaymentConfigService _shippingLinePaymentConfig;
    private readonly IPaymentService _paymentService;
    private readonly IDemurrageBillingService _demurrageBillingService;
    private readonly PayMongoOptions _options;
    private readonly IcsAppOptions _appOptions;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PayMongoService> _logger;

    public PayMongoService(
        IEcmsDbContext db,
        IPaymentSettingsService paymentSettings,
        IShippingLinePaymentConfigService shippingLinePaymentConfig,
        IPaymentService paymentService,
        IDemurrageBillingService demurrageBillingService,
        IOptions<PayMongoOptions> options,
        IOptions<IcsAppOptions> appOptions,
        IHttpClientFactory httpClientFactory,
        ILogger<PayMongoService> logger)
    {
        _db = db;
        _paymentSettings = paymentSettings;
        _shippingLinePaymentConfig = shippingLinePaymentConfig;
        _paymentService = paymentService;
        _demurrageBillingService = demurrageBillingService;
        _options = options.Value;
        _appOptions = appOptions.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public bool IsPlatformConfigured() => !string.IsNullOrWhiteSpace(ResolvePlatformSecretKey());

    public async Task<PayMongoCheckoutDto> CreateReturnCheckoutAsync(
        int scheduleId,
        int truckerId,
        CancellationToken cancellationToken = default)
    {
        var options = await _paymentSettings.GetReturnPaymentOptionsAsync(cancellationToken);
        if (!options.PayMongoEnabled)
            throw new InvalidOperationException("PayMongo is not enabled for pre-forecast payments.");
        if (!options.PayMongoConfigured)
            throw new InvalidOperationException("PayMongo is not configured. Contact the administrator.");

        var schedule = await _db.Schedules
            .Include(s => s.PreAdvice)
            .FirstOrDefaultAsync(s => s.Id == scheduleId && s.TruckerId == truckerId, cancellationToken)
            ?? throw new InvalidOperationException("Schedule not found.");

        var amount = await _paymentSettings.GetReturnFeeAmountAsync(cancellationToken);
        var payment = await _db.Payments.FirstOrDefaultAsync(p => p.ScheduleId == scheduleId, cancellationToken)
            ?? new Payment { ScheduleId = scheduleId, TruckerId = truckerId };

        if (payment.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("This return payment is already settled.");

        var frontend = ResolveFrontendBaseUrl();
        EnsureCheckoutRedirectBaseUrl(frontend);
        var successUrl = $"{frontend}/trucker/payments/{scheduleId}?paymongo=success";
        var cancelUrl = $"{frontend}/trucker/payments/{scheduleId}?paymongo=cancel";
        var description = $"Pre-forecast fee · {schedule.PreAdvice.ReferenceNo}";

        var session = await CreateCheckoutSessionAsync(
            ResolvePlatformSecretKey(),
            amount,
            description,
            successUrl,
            cancelUrl,
            new Dictionary<string, string>
            {
                ["ecms_type"] = "return",
                ["ecms_schedule_id"] = scheduleId.ToString(),
                ["ecms_trucker_id"] = truckerId.ToString(),
            },
            cancellationToken);

        payment.Amount = amount;
        payment.PaymentChannel = PaymentChannel.PayMongo;
        payment.PayMongoCheckoutSessionId = session.SessionId;
        payment.PayMongoPaymentIntentId = null;
        payment.Status = PaymentStatus.Pending;

        if (payment.Id == 0)
            _db.Add(payment);
        else
            _db.Update(payment);

        await _db.SaveChangesAsync(cancellationToken);

        return new PayMongoCheckoutDto(session.CheckoutUrl, session.SessionId);
    }

    public async Task<PayMongoCheckoutDto> CreateDemurrageCheckoutAsync(
        int billingId,
        int truckerId,
        CancellationToken cancellationToken = default)
    {
        var billing = await _db.DemurrageBillings
            .Include(b => b.PreAdvice)
            .Include(b => b.FeeLines)
            .FirstOrDefaultAsync(b => b.Id == billingId && b.TruckerId == truckerId, cancellationToken)
            ?? throw new InvalidOperationException("Demurrage billing not found.");

        if (billing.Status == PaymentStatus.Paid)
            throw new InvalidOperationException("This demurrage billing is already paid.");

        var options = await _shippingLinePaymentConfig.GetDemurrageOptionsAsync(billing.ShippingLineId, cancellationToken);
        if (!options.PayMongoEnabled)
            throw new InvalidOperationException("PayMongo is not enabled for this shipping line.");
        if (!options.PayMongoConfigured)
            throw new InvalidOperationException("PayMongo is not configured for this shipping line.");

        var secretKey = await ResolveShippingLineSecretKeyAsync(billing.ShippingLineId, cancellationToken);
        var amount = billing.FeeLines.Count > 0
            ? billing.FeeLines.Sum(l => l.Amount)
            : billing.DemurrageAmount + billing.DetentionAmount;

        if (amount <= 0)
            throw new InvalidOperationException("Demurrage amount must be greater than zero.");

        var frontend = ResolveFrontendBaseUrl();
        EnsureCheckoutRedirectBaseUrl(frontend);
        var successUrl = $"{frontend}/trucker/demurrage-billing/{billingId}?paymongo=success";
        var cancelUrl = $"{frontend}/trucker/demurrage-billing/{billingId}?paymongo=cancel";
        var description = $"Demurrage · {billing.ReferenceNo}";

        var session = await CreateCheckoutSessionAsync(
            secretKey,
            amount,
            description,
            successUrl,
            cancelUrl,
            new Dictionary<string, string>
            {
                ["ecms_type"] = "demurrage",
                ["ecms_billing_id"] = billingId.ToString(),
                ["ecms_trucker_id"] = truckerId.ToString(),
                ["ecms_shipping_line_id"] = billing.ShippingLineId.ToString(),
            },
            cancellationToken);

        billing.PaymentChannel = PaymentChannel.PayMongo;
        billing.PayMongoCheckoutSessionId = session.SessionId;
        billing.PayMongoPaymentIntentId = null;
        billing.Status = PaymentStatus.Pending;
        _db.Update(billing);
        await _db.SaveChangesAsync(cancellationToken);

        return new PayMongoCheckoutDto(session.CheckoutUrl, session.SessionId);
    }

    public async Task<bool> HandleWebhookAsync(
        string rawBody,
        string signatureHeader,
        CancellationToken cancellationToken = default)
    {
        if (!VerifyWebhookSignature(rawBody, signatureHeader))
        {
            _logger.LogWarning("PayMongo webhook signature verification failed.");
            return false;
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;
        if (!root.TryGetProperty("data", out var data) || !data.TryGetProperty("attributes", out var attributes))
            return false;

        var eventType = attributes.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;
        if (!string.Equals(eventType, "checkout_session.payment.paid", StringComparison.Ordinal))
            return true;

        if (!data.TryGetProperty("attributes", out var eventAttrs)
            || !eventAttrs.TryGetProperty("data", out var eventData))
            return false;

        var metadata = ReadMetadata(eventData);
        var paymentIntentId = ReadPaymentIntentId(eventData);
        var checkoutSessionId = eventData.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

        if (!metadata.TryGetValue("ecms_type", out var paymentType))
            return false;

        return paymentType switch
        {
            "return" when metadata.TryGetValue("ecms_schedule_id", out var scheduleIdRaw)
                && int.TryParse(scheduleIdRaw, out var scheduleId)
                => await _paymentService.CompletePayMongoReturnAsync(
                    scheduleId,
                    checkoutSessionId,
                    paymentIntentId,
                    cancellationToken),
            "demurrage" when metadata.TryGetValue("ecms_billing_id", out var billingIdRaw)
                && int.TryParse(billingIdRaw, out var billingId)
                => await _demurrageBillingService.CompletePayMongoAsync(
                    billingId,
                    checkoutSessionId,
                    paymentIntentId,
                    cancellationToken),
            _ => true,
        };
    }

    private async Task<(string SessionId, string CheckoutUrl)> CreateCheckoutSessionAsync(
        string secretKey,
        decimal amount,
        string description,
        string successUrl,
        string cancelUrl,
        IReadOnlyDictionary<string, string> metadata,
        CancellationToken cancellationToken)
    {
        PayMongoKeyHelper.EnsureSecretKey(secretKey);

        var centavos = (int)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
        if (centavos <= 0)
            throw new InvalidOperationException("Payment amount must be greater than zero.");

        var payload = new
        {
            data = new
            {
                attributes = new
                {
                    billing = new
                    {
                        name = "ICS ECMS",
                        email = "payments@ics-ecms.com",
                    },
                    send_email_receipt = false,
                    show_description = true,
                    show_line_items = true,
                    description,
                    line_items = new[]
                    {
                        new
                        {
                            amount = centavos,
                            currency = "PHP",
                            name = description,
                            quantity = 1,
                        },
                    },
                    payment_method_types = CheckoutPaymentMethodTypes,
                    success_url = successUrl,
                    cancel_url = cancelUrl,
                    metadata,
                },
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{ApiBase}/checkout_sessions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", EncodeBasicAuth(secretKey));
        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var client = _httpClientFactory.CreateClient(nameof(PayMongoService));
        using var response = await client.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var detail = ReadPayMongoError(body);
            _logger.LogError("PayMongo checkout session failed ({Status}): {Body}", response.StatusCode, body);
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(detail)
                    ? "Unable to start PayMongo checkout. Please try again or upload proof instead."
                    : $"Unable to start PayMongo checkout: {detail}");
        }

        using var doc = JsonDocument.Parse(body);
        var data = doc.RootElement.GetProperty("data");
        var sessionId = data.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("PayMongo returned an invalid checkout session.");
        var checkoutUrl = data.GetProperty("attributes").GetProperty("checkout_url").GetString()
            ?? throw new InvalidOperationException("PayMongo returned an invalid checkout URL.");

        return (sessionId, checkoutUrl);
    }

    private bool VerifyWebhookSignature(string rawBody, string signatureHeader)
    {
        var webhookSecret = ResolveWebhookSecret();
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            _logger.LogWarning("PayMongo webhook secret is not configured.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
            return false;

        var parts = signatureHeader.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        string? timestamp = null;
        string? signature = null;
        foreach (var part in parts)
        {
            var kv = part.Split('=', 2);
            if (kv.Length != 2) continue;
            if (kv[0] == "t") timestamp = kv[1];
            if (kv[0] == "te" || kv[0] == "li") signature = kv[1];
        }

        if (timestamp is null || signature is null)
            return false;

        var signedPayload = $"{timestamp}.{rawBody}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(webhookSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }

    private static Dictionary<string, string> ReadMetadata(JsonElement eventData)
    {
        var metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!eventData.TryGetProperty("attributes", out var attrs)
            || !attrs.TryGetProperty("metadata", out var metaEl)
            || metaEl.ValueKind != JsonValueKind.Object)
            return metadata;

        foreach (var prop in metaEl.EnumerateObject())
            metadata[prop.Name] = prop.Value.GetString() ?? string.Empty;

        return metadata;
    }

    private static string? ReadPaymentIntentId(JsonElement eventData)
    {
        if (!eventData.TryGetProperty("attributes", out var attrs))
            return null;
        if (attrs.TryGetProperty("payment_intent", out var intent)
            && intent.TryGetProperty("id", out var intentId))
            return intentId.GetString();
        if (attrs.TryGetProperty("payments", out var payments)
            && payments.ValueKind == JsonValueKind.Array
            && payments.GetArrayLength() > 0)
        {
            var first = payments[0];
            if (first.TryGetProperty("id", out var paymentId))
                return paymentId.GetString();
        }

        return null;
    }

    private async Task<string> ResolveShippingLineSecretKeyAsync(int shippingLineId, CancellationToken cancellationToken)
    {
        var config = await _db.ShippingLinePaymentConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ShippingLineId == shippingLineId, cancellationToken);

        var lineKey = PayMongoKeyHelper.Sanitize(config?.PayMongoSecretKey);
        if (!string.IsNullOrWhiteSpace(lineKey))
            return lineKey;

        return ResolvePlatformSecretKey();
    }

    private string ResolvePlatformSecretKey()
        => PayMongoKeyHelper.Sanitize(Environment.GetEnvironmentVariable("PAYMONGO_SECRET_KEY"))
            ?? PayMongoKeyHelper.Sanitize(_options.SecretKey)
            ?? string.Empty;

    private string ResolveWebhookSecret()
        => PayMongoKeyHelper.Sanitize(Environment.GetEnvironmentVariable("PAYMONGO_WEBHOOK_SECRET"))
            ?? PayMongoKeyHelper.Sanitize(_options.WebhookSecret)
            ?? string.Empty;

    private string ResolveFrontendBaseUrl()
    {
        var envUrl = Environment.GetEnvironmentVariable("PUBLIC_FRONTEND_URL");
        if (!string.IsNullOrWhiteSpace(envUrl))
            return envUrl.Trim().TrimEnd('/');

        var url = _appOptions.PublicFrontendUrl?.Trim();
        if (string.IsNullOrWhiteSpace(url))
            url = "http://localhost:5173";
        return url.TrimEnd('/');
    }

    private static void EnsureCheckoutRedirectBaseUrl(string frontendBaseUrl)
    {
        if (!Uri.TryCreate(frontendBaseUrl, UriKind.Absolute, out var uri))
            throw new InvalidOperationException(
                "Public frontend URL is invalid. Set PUBLIC_FRONTEND_URL (or App__PublicFrontendUrl) on the API server.");

        if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1")
        {
            throw new InvalidOperationException(
                "PayMongo checkout needs a public HTTPS site URL for payment redirects. Set PUBLIC_FRONTEND_URL (or App__PublicFrontendUrl) on the API server.");
        }

        if (!string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "PayMongo checkout redirect URL must use HTTPS. Set PUBLIC_FRONTEND_URL to your production https:// site URL.");
        }
    }

    private static string ReadPayMongoError(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("errors", out var errors)
                || errors.ValueKind != JsonValueKind.Array
                || errors.GetArrayLength() == 0)
                return string.Empty;

            var first = errors[0];
            if (first.TryGetProperty("detail", out var detail))
                return detail.GetString() ?? string.Empty;
        }
        catch (JsonException)
        {
            return string.Empty;
        }

        return string.Empty;
    }

    private static string EncodeBasicAuth(string secretKey)
        => Convert.ToBase64String(Encoding.UTF8.GetBytes($"{secretKey}:"));
}
