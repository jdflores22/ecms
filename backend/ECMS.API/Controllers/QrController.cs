using System.Security.Claims;
using ECMS.API.Filters;
using ECMS.Application.DTOs.QR;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/qr")]
public class QrController : ControllerBase
{
    private readonly IQrService _service;

    public QrController(IQrService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("{bookingId:int}")]
    [Authorize]
    public async Task<ActionResult<QrBookingDto>> Get(int bookingId, CancellationToken cancellationToken)
    {
        var booking = await _service.GetByBookingIdAsync(bookingId, cancellationToken);
        return booking is null ? NotFound() : Ok(booking);
    }

    [HttpGet("download/{bookingId:int}")]
    [Authorize]
    public async Task<IActionResult> Download(int bookingId, CancellationToken cancellationToken)
    {
        var bytes = await _service.DownloadQrAsync(bookingId, cancellationToken);
        return bytes is null ? NotFound() : File(bytes, "image/png", $"qr-{bookingId}.png");
    }

    [HttpGet("schedule/{scheduleId:int}")]
    [Authorize]
    public async Task<ActionResult<QrBookingDto>> GetBySchedule(int scheduleId, CancellationToken cancellationToken)
    {
        var booking = await _service.GetByScheduleIdAsync(scheduleId, cancellationToken);
        return booking is null ? NotFound() : Ok(booking);
    }

    [HttpGet("code/{qrCode}")]
    [Authorize]
    public async Task<ActionResult<QrBookingDto>> GetByCode(string qrCode, CancellationToken cancellationToken)
    {
        var booking = await _service.GetByQrCodeAsync(qrCode, UserId, Role, cancellationToken);
        return booking is null ? NotFound() : Ok(booking);
    }

    [HttpPost("generate/{scheduleId:int}")]
    [Authorize]
    public async Task<ActionResult<QrBookingDto>> Generate(int scheduleId, CancellationToken cancellationToken)
        => Ok(await _service.GenerateForScheduleAsync(scheduleId, cancellationToken));

    [HttpPost("{bookingId:int}/book-logicteck")]
    [Authorize]
    public async Task<ActionResult<BookLogicteckResponse>> BookLogicteck(int bookingId, CancellationToken cancellationToken)
    {
        var result = await _service.BookLogicteckAsync(bookingId, UserId, Role, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

[ApiController]
[Route("api/logicteck")]
[ServiceFilter(typeof(LogicteckApiKeyFilter))]
public class LogicteckController : ControllerBase
{
    private readonly IQrService _service;

    public LogicteckController(IQrService service)
    {
        _service = service;
    }

    /// <summary>LOGICTECK gate scanner validates a booking QR and marks it retrieved.</summary>
    [HttpPost("validate-qr")]
    [AllowAnonymous]
    public async Task<ActionResult<ValidateQrResponse>> ValidateQr([FromBody] ValidateQrRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.QrCode))
            return BadRequest(new ValidateQrResponse(false, "qrCode is required.", null, null, null, null, null, null, null, null));

        return Ok(await _service.ValidateAsync(request, cancellationToken));
    }

    /// <summary>Read-only booking lookup for LOGICTECK (does not mark QR as retrieved).</summary>
    [HttpGet("booking/{qrCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<LogicteckBookingLookupResponse>> GetBooking(string qrCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(qrCode))
            return BadRequest(new LogicteckBookingLookupResponse(false, "qrCode is required.", null, null, null, null, null, null, null, null, false, false));

        var result = await _service.LookupForLogicteckAsync(qrCode, cancellationToken);
        return result!.Found ? Ok(result) : NotFound(result);
    }

    /// <summary>Full pre-advice transfer dossier for LOGICTECK (details + photo URLs + QR image).</summary>
    [HttpGet("booking/{qrCode}/dossier")]
    [AllowAnonymous]
    public async Task<ActionResult<LogicteckBookingDossierResponse>> GetBookingDossier(string qrCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(qrCode))
        {
            return BadRequest(new LogicteckBookingDossierResponse(
                false, "qrCode is required.", null, null, null, null, null, null, null, null,
                false, false, null, null, null, Array.Empty<LogicteckDossierDocumentDto>()));
        }

        var result = await _service.LookupDossierForLogicteckAsync(qrCode, cancellationToken);
        return result!.Found ? Ok(result) : NotFound(result);
    }
}
