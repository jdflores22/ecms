using ECMS.Domain.Common;
using ECMS.Infrastructure.Services;

namespace ECMS.API.Tests;

public class PaymentProofTextParserTests
{
    [Fact]
    public void Parse_MayaQrPh_ExtractsReferenceIdAndDate()
    {
        const string text = """
            Purchased from
            - P500.00
            transnetsoftwaredevelopme
            Jul 1, 2026, 05:11 pm
            Paid using QR Ph
            Reference ID 1CB1 1EB8 9D49
            Payment ID FEC0 B60F 7440
            QR Ph Invoice No 112375
            maya
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("1CB11EB89D49", parsed.ReferenceNo);
        Assert.Equal("112375", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        Assert.Equal("maya", parsed.Provider);
    }

    [Fact]
    public void Parse_UnionBank_GarbledOcrHeader_ExtractsUbReferenceOnly()
    {
        const string text = """
            Transaction Details
            Reference Number Transaction Date UB983940 Jul 01, 2026 09:13PM
            P2M On Us transnetsoftwaredevelopme
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("UB983940", parsed.ReferenceNo);
        Assert.Null(parsed.QrphInvoiceNo);
        Assert.Equal("unionbank", parsed.Provider);
    }

    [Fact]
    public void NormalizeReferenceNo_StripsGluedOcrNoise()
    {
        Assert.Equal("UB983940", PaymentProofTextParser.NormalizeReferenceNo("TRANSACTIONDATEUB983940JUL01"));
    }

    [Fact]
    public void Parse_UnionBank_ExtractsAlphanumericReferenceAndGluedMeridiem()
    {
        const string text = """
            Transaction Details
            Reference Number UB983940
            Jul 01, 2026 09:13PM
            Union Bank of the Philippines
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("UB983940", parsed.ReferenceNo);
        Assert.Null(parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        Assert.Equal("unionbank", parsed.Provider);
    }

    [Fact]
    public void Parse_GCashInbox_ExtractsRefAndShortDate()
    {
        const string text = """
            Successful Payment via QR
            You have paid P500.00 via GCash to transnetsoftwaredevelopme on 07-01-26 10:36:18 AM.
            Ref. No. 039014770. QRPH Invoice No. 276913.
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("039014770", parsed.ReferenceNo);
        Assert.Equal("276913", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        Assert.Equal("gcash", parsed.Provider);
    }

    [Fact]
    public void Parse_BancNet_ExtractsReferenceNumber()
    {
        const string text = """
            Payment to Bancnet P2M Send
            -500.00
            Jun 30, 2026 5:50PM
            Reference Number 942124008
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("942124008", parsed.ReferenceNo);
        Assert.NotNull(parsed.TransactionAt);
    }

    [Fact]
    public void Parse_GCashQr_ExtractsReferenceNo()
    {
        const string text = """
            Transnetsoftwaredevelopme
            Paid via GCash
            Jul 01, 2026 6:23 PM
            Reference No. 145183977
            QRPH Invoice No. 481174
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("145183977", parsed.ReferenceNo);
        Assert.Equal("481174", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
    }

    [Fact]
    public void Parse_GCashP2P_ExtractsSpacedReference()
    {
        const string text = """
            Sent via GCash
            Ref No. 5014 349 566710
            Jan 05, 2024 12:13 PM
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("5014349566710", parsed.ReferenceNo);
        Assert.NotNull(parsed.TransactionAt);
        Assert.Equal("gcash", parsed.Provider);
    }

    [Fact]
    public void Parse_MayaWithMerchantUnionBank_DetectsMayaNotUnionBank()
    {
        const string text = """
            Purchased from
            - P500.00
            transnetsoftwaredevelopme
            Jul 1, 2026, 05:11 pm
            Paid using QR Ph
            Merchant ID 99917910
            Bank name Union Bank of the Philippines
            Reference ID 1CB1 1EB8 9D49
            Payment ID FEC0 B60F 7440
            QR Ph Invoice No 112375
            maya
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("maya", parsed.Provider);
        Assert.Equal("1CB11EB89D49", parsed.ReferenceNo);
        Assert.Equal("112375", parsed.QrphInvoiceNo);
    }

    [Fact]
    public void Parse_GCashPaymentScreen_ExtractsReferenceQrphAndProvider()
    {
        const string text = """
            Payment
            Transnetsoftwaredevelopme
            Paid via GCash
            Total P 500.00
            Your payment was successfully processed.
            Jun 25, 2026 10:05 PM
            Reference No. 225101904
            QRPH Invoice No. 543305
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        Assert.Equal("gcash", parsed.Provider);
    }

    [Fact]
    public void Parse_GCashPhotoOfScreen_GarbledOcr_ExtractsNineAndSixDigitIds()
    {
        const string text = """
            wos Se -
            Payment x
            Transnetsoftwaredevelopm [
            e
            ota =
            idl 225101904 0
            ETRE il 543305 0
            fic
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.Equal("gcash", parsed.Provider);
    }

    [Fact]
    public void Parse_GCashPaymentScreen_CleanReceipt_ExtractsAllFields()
    {
        const string text = """
            Payment
            Transnetsoftwaredevelopme
            Paid via GCash
            Amount 500.00
            Total P 500.00
            Your payment was successfully processed.
            Jun 25, 2026 10:05 PM
            Reference No. 225101904
            QRPH Invoice No. 543305
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        Assert.Equal("gcash", parsed.Provider);
    }

    [Fact]
    public void Parse_GCashPaymentScreen_GarbledOcr_ExtractsNumericFallback()
    {
        const string text = """
            wos Se -
            Payment x
            Transnetsoftwaredevelopm [
            e
            ota =
            idl 225101904 0
            ETRE il 543305 0
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.Equal("gcash", parsed.Provider);
    }

    [Fact]
    public void Parse_GCashPaymentScreen_GarbledOcr_ExtractsDateFromSplitFragments()
    {
        const string text = """
            Payment
            Transnetsoftwaredevelopm
            Jun 25, 2026
            10:05 eM
            idl 225101904 0
            ETRE il 543305 0
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        var local = TimeZoneInfo.ConvertTimeFromUtc(parsed.TransactionAt!.Value, PhilippinesTime.Zone);
        Assert.Equal(25, local.Day);
        Assert.Equal(22, local.Hour);
        Assert.Equal(5, local.Minute);
    }

    [Fact]
    public void Parse_GCashPaymentScreen_GarbledOcr_ExtractsDateFromFragments()
    {
        const string text = """
            Payment
            Transnetsoftwaredevelopm
            idl 225101904 0
            Jun 25, 2026
            10:05 eM
            ETRE il 543305 0
            """;

        var parsed = PaymentProofTextParser.Parse(text);

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        var local = TimeZoneInfo.ConvertTimeFromUtc(parsed.TransactionAt!.Value, PhilippinesTime.Zone);
        Assert.Equal(25, local.Day);
        Assert.Equal(22, local.Hour);
        Assert.Equal(5, local.Minute);
    }

    [Fact]
    public void ParseTexts_MergesBestFieldsFromMultiplePasses()
    {
        const string garbled = """
            Payment
            Transnetsoftwaredevelopm
            225101904
            543305
            """;

        const string datePass = """
            Date Jun 25, 2026 10:05 PM
            Reference No. 225101904
            QRPH Invoice No. 543305
            """;

        var parsed = PaymentProofTextParser.ParseTexts(new[]
        {
            (garbled, 10),
            (datePass, 18),
        });

        Assert.Equal("225101904", parsed.ReferenceNo);
        Assert.Equal("543305", parsed.QrphInvoiceNo);
        Assert.NotNull(parsed.TransactionAt);
        var local = TimeZoneInfo.ConvertTimeFromUtc(parsed.TransactionAt!.Value, PhilippinesTime.Zone);
        Assert.Equal(25, local.Day);
        Assert.Equal(22, local.Hour);
        Assert.Equal(5, local.Minute);
    }

    [Fact]
    public void Parse_GrabPay_DetectsProvider()
    {
        const string text = "Paid via GrabPay to merchant. Ref. No. 882211009";
        var parsed = PaymentProofTextParser.Parse(text);
        Assert.Equal("grabpay", parsed.Provider);
    }

    [Fact]
    public void ResolveReceiptDateFallback_UsesPaidAtWhenOcrMissesDate()
    {
        var parsed = new PaymentProofMetadata("225101904", "543305", null, "gcash");
        var paidAt = new DateTime(2026, 6, 25, 14, 30, 0, DateTimeKind.Utc);

        var resolved = PaymentProofTextParser.ResolveReceiptDateFallback(parsed, paidAt);

        Assert.NotNull(resolved);
        Assert.Equal(paidAt, resolved);
    }

    [Fact]
    public void ResolveReceiptDateFallback_SkipsWhenNothingDetected()
    {
        var parsed = new PaymentProofMetadata(null, null, null, null);
        var paidAt = new DateTime(2026, 6, 25, 14, 30, 0, DateTimeKind.Utc);

        var resolved = PaymentProofTextParser.ResolveReceiptDateFallback(parsed, paidAt);

        Assert.Null(resolved);
    }
}
