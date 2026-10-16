using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ECMS.API.Tests;

[Collection("EcmsIntegration")]
public class LogicteckIntegrationTests : IClassFixture<EcmsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public LogicteckIntegrationTests(EcmsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Lookup_includes_permanent_transfer_link()
    {
        var qrCode = await CreatePublishedQrAsync();
        ApiTestHelper.ClearAuth(_client);

        var lookupResponse = await _client.GetAsync($"/api/logicteck/booking/{Uri.EscapeDataString(qrCode)}");
        Assert.Equal(HttpStatusCode.OK, lookupResponse.StatusCode);

        var lookup = await lookupResponse.Content.ReadFromJsonAsync<LookupResponse>();
        Assert.NotNull(lookup);
        Assert.True(lookup.Found);
        Assert.NotNull(lookup.TransferLink);
        Assert.Equal(qrCode, lookup.TransferLink!.TransferReference);
        Assert.False(string.IsNullOrWhiteSpace(lookup.TransferLink.LookupUrl));
        Assert.False(string.IsNullOrWhiteSpace(lookup.TransferLink.DossierUrl));
        Assert.False(string.IsNullOrWhiteSpace(lookup.TransferLink.ValidateUrl));
        Assert.False(string.IsNullOrWhiteSpace(lookup.TransferLink.IcsTruckerName));

        var dossierResponse = await _client.GetAsync($"/api/logicteck/booking/{Uri.EscapeDataString(qrCode)}/dossier");
        var dossier = await dossierResponse.Content.ReadFromJsonAsync<DossierResponse>();
        Assert.NotNull(dossier);
        Assert.NotNull(dossier.TransferLink);
        Assert.Equal(qrCode, dossier.TransferLink!.TransferReference);
    }

    [Fact]
    public async Task Validate_qr_marks_booking_retrieved_and_lookup_reflects_status()
    {
        var qrCode = await CreatePublishedQrAsync();
        ApiTestHelper.ClearAuth(_client);

        var validateResponse = await _client.PostAsJsonAsync("/api/logicteck/validate-qr", new { qrCode });
        Assert.Equal(HttpStatusCode.OK, validateResponse.StatusCode);

        var validate = await validateResponse.Content.ReadFromJsonAsync<ValidateQrResponse>();
        Assert.NotNull(validate);
        Assert.True(validate.Valid);
        Assert.Equal(qrCode, validate.BookingReference);
        Assert.False(string.IsNullOrWhiteSpace(validate.ContainerNo));

        var lookupResponse = await _client.GetAsync($"/api/logicteck/booking/{Uri.EscapeDataString(qrCode)}");
        Assert.Equal(HttpStatusCode.OK, lookupResponse.StatusCode);

        var lookup = await lookupResponse.Content.ReadFromJsonAsync<LookupResponse>();
        Assert.NotNull(lookup);
        Assert.True(lookup.Found);
        Assert.True(lookup.IsRetrieved);

        var secondValidate = await _client.PostAsJsonAsync("/api/logicteck/validate-qr", new { qrCode });
        var second = await secondValidate.Content.ReadFromJsonAsync<ValidateQrResponse>();
        Assert.NotNull(second);
        Assert.False(second.Valid);
    }

    [Fact]
    public async Task Ack_booking_marks_isBooked_without_ics_push()
    {
        var qrCode = await CreatePublishedQrAsync();
        ApiTestHelper.ClearAuth(_client);

        var ackResponse = await _client.PostAsJsonAsync(
            "/api/logicteck/ack-booking",
            new { qrCode, reference = "LT-PLAYGROUND-9001" });
        Assert.Equal(HttpStatusCode.OK, ackResponse.StatusCode);

        var ack = await ackResponse.Content.ReadFromJsonAsync<AckBookingResponse>();
        Assert.NotNull(ack);
        Assert.True(ack.Accepted);
        Assert.Equal(qrCode, ack.BookingReference);
        Assert.Equal("LT-PLAYGROUND-9001", ack.ExternalReference);
        Assert.True(ack.IsBooked);

        var lookupResponse = await _client.GetAsync($"/api/logicteck/booking/{Uri.EscapeDataString(qrCode)}");
        var lookup = await lookupResponse.Content.ReadFromJsonAsync<LookupResponse>();
        Assert.NotNull(lookup);
        Assert.True(lookup.IsBooked);
        Assert.False(lookup.IsRetrieved);
        Assert.NotNull(lookup.TransferLink);
        Assert.Contains("ack-booking", lookup.TransferLink!.AckBookingUrl, StringComparison.OrdinalIgnoreCase);

        var duplicate = await _client.PostAsJsonAsync(
            "/api/logicteck/ack-booking",
            new { qrCode, reference = "LT-PLAYGROUND-9001" });
        var dupBody = await duplicate.Content.ReadFromJsonAsync<AckBookingResponse>();
        Assert.NotNull(dupBody);
        Assert.True(dupBody.Accepted);
        Assert.True(dupBody.Duplicate);
    }

    [Fact]
    public async Task Trucker_push_book_logicteck_fails_when_book_url_not_configured()
    {
        var (bookingId, truckerToken) = await CreatePublishedQrWithTruckerTokenAsync();
        ApiTestHelper.UseBearer(_client, truckerToken);

        var bookResponse = await _client.PostAsync($"/api/qr/{bookingId}/book-logicteck", null);
        Assert.Equal(HttpStatusCode.BadRequest, bookResponse.StatusCode);

        var book = await bookResponse.Content.ReadFromJsonAsync<BookResponse>();
        Assert.NotNull(book);
        Assert.False(book.Success);
    }

    private async Task<string> CreatePublishedQrAsync()
    {
        var (bookingId, _) = await CreatePublishedQrWithTruckerTokenAsync();
        var bookingResponse = await _client.GetAsync($"/api/qr/{bookingId}");
        bookingResponse.EnsureSuccessStatusCode();
        var booking = await bookingResponse.Content.ReadFromJsonAsync<QrBookingResponse>();
        return booking!.QrCode;
    }

    private async Task<(int BookingId, string TruckerToken)> CreatePublishedQrWithTruckerTokenAsync()
    {
        var submitterToken = await ApiTestHelper.LoginAsync(_client, "trucker1", "Trucker@123");
        ApiTestHelper.UseBearer(_client, submitterToken);

        var lookups = await _client.GetFromJsonAsync<ApiTestHelper.PreAdviceLookupResponse>("/api/preforecast/lookups");
        Assert.NotNull(lookups);

        var createResponse = await _client.PostAsJsonAsync(
            "/api/preforecast",
            ApiTestHelper.BuildCreatePreAdvicePayload(lookups, $"Logicteck test {Guid.NewGuid():N}"));
        createResponse.EnsureSuccessStatusCode();
        var preAdvice = await createResponse.Content.ReadFromJsonAsync<ApiTestHelper.PreAdviceResponse>();
        Assert.NotNull(preAdvice);

        await ApiTestHelper.UploadAllStandardPhotosAsync(_client, preAdvice.Id);
        await _client.PostAsync($"/api/preforecast/{preAdvice.Id}/submit", null);

        await ApiTestHelper.ApprovePreAdviceForTestAsync(
            _client,
            preAdvice.Id,
            "Approved for LOGICTECK test");

        var depotToken = await ApiTestHelper.LoginAsync(_client, "depot1", "Depot@123");
        ApiTestHelper.UseBearer(_client, depotToken);

        var schedules = await _client.GetFromJsonAsync<List<ApiTestHelper.ScheduleResponse>>("/api/schedules");
        Assert.NotNull(schedules);
        var schedule = schedules.First(s => s.ReferenceNo == preAdvice.ReferenceNo);

        await ApiTestHelper.AssignDepotScheduleForTestAsync(
            _client,
            schedule.Id,
            schedule.DepotId,
            depotToken);

        var paymentId = await ApiTestHelper.UploadPaymentProofForTestAsync(_client, submitterToken, schedule.Id);
        await ApiTestHelper.VerifyPaymentForTestAsync(_client, paymentId);

        ApiTestHelper.UseBearer(_client, submitterToken);
        var qrResponse = await _client.GetAsync($"/api/qr/schedule/{schedule.Id}");
        qrResponse.EnsureSuccessStatusCode();
        var qr = await qrResponse.Content.ReadFromJsonAsync<QrBookingResponse>();
        Assert.NotNull(qr);

        return (qr.Id, submitterToken);
    }

    private record QrBookingResponse(int Id, string QrCode, string LogicteckStatus);

    private record ValidateQrResponse(
        bool Valid,
        string? Message,
        string? BookingReference,
        string? ContainerNo,
        string? ShippingLine,
        string? Trucker,
        string? PreAdviceReference,
        string? ScheduledDate,
        string? ScheduledTime,
        string? Depot);

    private record LookupResponse(
        bool Found,
        bool IsBooked,
        bool IsRetrieved,
        TransferLinkResponse? TransferLink);

    private record TransferLinkResponse(
        string TransferReference,
        int IcsTruckerId,
        string? IcsTruckerUsername,
        string IcsTruckerName,
        string LookupUrl,
        string DossierUrl,
        string ValidateUrl,
        string AckBookingUrl,
        string CallbackUrl);

    private record AckBookingResponse(
        bool Accepted,
        bool Duplicate,
        string? Message,
        string? BookingReference,
        string? ExternalReference,
        bool IsBooked);

    private record DossierResponse(bool Found, TransferLinkResponse? TransferLink);

    private record BookResponse(bool Success, QrBookingResponse? Booking);
}
