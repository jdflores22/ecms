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
    public async Task Trucker_can_book_logicteck_before_gate_validation()
    {
        var (bookingId, truckerToken) = await CreatePublishedQrWithTruckerTokenAsync();

        var bookResponse = await _client.PostAsync($"/api/qr/{bookingId}/book-logicteck", null);
        Assert.Equal(HttpStatusCode.OK, bookResponse.StatusCode);

        var book = await bookResponse.Content.ReadFromJsonAsync<BookResponse>();
        Assert.NotNull(book);
        Assert.True(book.Success);
        Assert.Equal("Booked", book.Booking?.LogicteckStatus);

        ApiTestHelper.ClearAuth(_client);
        var lookupResponse = await _client.GetAsync($"/api/logicteck/booking/{Uri.EscapeDataString(book!.Booking!.QrCode)}");
        var lookup = await lookupResponse.Content.ReadFromJsonAsync<LookupResponse>();
        Assert.NotNull(lookup);
        Assert.True(lookup.IsBooked);
        Assert.False(lookup.IsRetrieved);

        ApiTestHelper.UseBearer(_client, truckerToken);
        var repeatBook = await _client.PostAsync($"/api/qr/{bookingId}/book-logicteck", null);
        Assert.Equal(HttpStatusCode.OK, repeatBook.StatusCode);
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

        var evaluatorToken = await ApiTestHelper.LoginAsync(_client, "evaluator1", "Evaluator@123");
        ApiTestHelper.UseBearer(_client, evaluatorToken);

        var depots = await _client.GetFromJsonAsync<List<ApiTestHelper.DepotResponse>>("/api/depots");
        Assert.NotNull(depots);
        Assert.NotEmpty(depots);
        var depotId = depots[0].Id;

        await _client.PostAsJsonAsync("/api/evaluations/approve", new
        {
            preAdviceId = preAdvice.Id,
            depotId,
            remarks = "Approved for LOGICTECK test",
        });

        ApiTestHelper.UseBearer(_client, submitterToken);
        var truckerSchedules = await _client.GetFromJsonAsync<List<ApiTestHelper.ScheduleResponse>>("/api/schedules");
        Assert.NotNull(truckerSchedules);
        var schedule = truckerSchedules.First(s => s.ReferenceNo == preAdvice.ReferenceNo);

        var depotToken = await ApiTestHelper.LoginAsync(_client, "depot1", "Depot@123");
        ApiTestHelper.UseBearer(_client, depotToken);

        var tomorrow = ECMS.Domain.Common.PhilippinesTime.AddDays(ECMS.Domain.Common.PhilippinesTime.Today, 1);

        await _client.PutAsJsonAsync($"/api/schedules/{schedule.Id}", new
        {
            date = tomorrow.ToString("yyyy-MM-dd"),
            time = "08:00:00",
            slotNo = 0,
            status = "Scheduled",
        });

        ApiTestHelper.UseBearer(_client, submitterToken);

        using var form = new MultipartFormDataContent
        {
            { new StringContent(schedule.Id.ToString()), "scheduleId" },
            { new StringContent("1500.00"), "amount" },
        };
        var pngBytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "proof", "proof.png");

        var payment = await (await _client.PostAsync("/api/payments/upload", form))
            .Content.ReadFromJsonAsync<ApiTestHelper.PaymentResponse>();

        ApiTestHelper.UseBearer(_client, depotToken);
        await _client.PostAsync($"/api/payments/{payment!.Id}/verify?approved=true", null);

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
        string ValidateUrl);

    private record DossierResponse(bool Found, TransferLinkResponse? TransferLink);

    private record BookResponse(bool Success, QrBookingResponse? Booking);
}
