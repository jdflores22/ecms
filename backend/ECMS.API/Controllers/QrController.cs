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

    [HttpPost("generate/{scheduleId:int}")]
    [Authorize]
    public async Task<ActionResult<QrBookingDto>> Generate(int scheduleId, CancellationToken cancellationToken)
        => Ok(await _service.GenerateForScheduleAsync(scheduleId, cancellationToken));
}

[ApiController]
[Route("api/logicteck")]
public class LogicteckController : ControllerBase
{
    private readonly IQrService _service;

    public LogicteckController(IQrService service)
    {
        _service = service;
    }

    [HttpPost("validate-qr")]
    [AllowAnonymous]
    public async Task<ActionResult<ValidateQrResponse>> ValidateQr([FromBody] ValidateQrRequest request, CancellationToken cancellationToken)
        => Ok(await _service.ValidateAsync(request, cancellationToken));
}
