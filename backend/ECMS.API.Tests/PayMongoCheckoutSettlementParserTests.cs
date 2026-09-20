using System.Text.Json;
using ECMS.Infrastructure.Services;
using Xunit;

namespace ECMS.API.Tests;

public class PayMongoCheckoutSettlementParserTests
{
    [Fact]
    public void TryParseCheckoutSession_ExtractsGcashReferenceAndProvider()
    {
        const string json = """
            {
              "id": "cs_test",
              "attributes": {
                "payment_intent": { "id": "pi_abc123xyz" },
                "payments": [
                  {
                    "id": "pay_9f8e7d6c5b",
                    "attributes": {
                      "type": "gcash",
                      "status": "paid",
                      "paid_at": 1694594940,
                      "external_reference_number": "14467664"
                    }
                  }
                ]
              }
            }
            """;

        using var doc = JsonDocument.Parse(json);
        var details = PayMongoCheckoutSettlementParser.TryParseCheckoutSession(doc.RootElement, "pi_abc123xyz");

        Assert.NotNull(details);
        Assert.Equal("14467664", details!.ReferenceNo);
        Assert.Equal("gcash", details.Provider);
        Assert.Equal("pay_9f8e7d6c5b", details.PaymentId);
        Assert.NotNull(details.PaidAtUtc);
    }
}
