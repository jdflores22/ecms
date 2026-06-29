using System.Security.Claims;
using ECMS.Application.DTOs.Payment;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service;
    private readonly IPaymentSettingsService _settings;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public PaymentsController(
        IPaymentService service,
        IPaymentSettingsService settings,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _service = service;
        _settings = settings;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static string? UserRole(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role");

    private string UploadDirectory =>
        Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");

    [HttpGet("settings")]
    public async Task<ActionResult<PaymentSettingsDto>> GetSettings(CancellationToken cancellationToken)
        => Ok(await _settings.GetAsync(cancellationToken));

    [HttpPut("settings")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<PaymentSettingsDto>> UpdateSettings(
        [FromBody] UpdatePaymentSettingsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _settings.UpdateReturnFeeAsync(request.ReturnFeeAmount, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("upload")]
    [Authorize(Roles = RoleNames.Trucker)]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<PaymentDto>> Upload(
        [FromForm] int scheduleId,
        IFormFile proof,
        [FromForm] string? proofReferenceNo,
        [FromForm] string? proofTransactionAt,
        CancellationToken cancellationToken)
    {
        if (proof is null || proof.Length == 0)
            return BadRequest(new { message = "Proof file is required." });

        var extension = Path.GetExtension(proof.FileName).ToLowerInvariant();
        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp" or ".pdf"))
            return BadRequest(new { message = "Proof must be JPG, PNG, WEBP, or PDF." });

        Directory.CreateDirectory(UploadDirectory);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(proof.FileName)}";
        var filePath = Path.Combine(UploadDirectory, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await proof.CopyToAsync(stream, cancellationToken);

        var relativePath = $"/uploads/{fileName}";
        DateTime? transactionAt = null;
        if (!string.IsNullOrWhiteSpace(proofTransactionAt)
            && DateTime.TryParse(proofTransactionAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
        {
            transactionAt = parsed.Kind == DateTimeKind.Utc
                ? parsed
                : ECMS.Domain.Common.PhilippinesTime.ToUtcFromPhilippines(parsed);
        }

        return Ok(await _service.UploadProofAsync(
            new UploadPaymentRequest(scheduleId, proofReferenceNo, transactionAt),
            UserId,
            relativePath,
            filePath,
            cancellationToken));
    }

    [HttpGet("status/{id:int}")]
    public async Task<ActionResult<PaymentStatusDto>> GetStatus(int id, CancellationToken cancellationToken)
    {
        var role = UserRole(User) ?? string.Empty;
        var status = await _service.GetStatusAsync(id, UserId, role, cancellationToken);
        return status is null ? NotFound() : Ok(status);
    }

    [HttpGet("mine")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetMine(CancellationToken cancellationToken)
        => Ok(await _service.GetByTruckerAsync(UserId, cancellationToken));

    [HttpGet("pending")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetPending(CancellationToken cancellationToken)
        => Ok(await _service.GetPendingVerificationAsync(null, cancellationToken));

    [HttpGet("pending/count")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<ECMS.Application.DTOs.Common.CountDto>> GetPendingCount(CancellationToken cancellationToken)
        => Ok(new ECMS.Application.DTOs.Common.CountDto(await _service.GetPendingVerificationCountAsync(cancellationToken)));

    [HttpGet("due/count")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<ECMS.Application.DTOs.Common.CountDto>> GetDueCount(CancellationToken cancellationToken)
        => Ok(new ECMS.Application.DTOs.Common.CountDto(await _service.GetPaymentDueCountAsync(UserId, cancellationToken)));

    [HttpGet("depot")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetDepot(CancellationToken cancellationToken)
        => Ok(await _service.GetForDepotAsync(null, cancellationToken));

    [HttpGet("by-schedule/{scheduleId:int}")]
    public async Task<ActionResult<PaymentDto>> GetBySchedule(int scheduleId, CancellationToken cancellationToken)
    {
        int? depotId = null;
        var role = UserRole(User);
        if (role == RoleNames.DepotPersonnel && int.TryParse(User.FindFirstValue("depotId"), out var depot))
            depotId = depot;

        int? shippingLineId = null;
        if (role == RoleNames.ShippingLineEvaluator
            && int.TryParse(User.FindFirstValue("shippingLineId"), out var line))
            shippingLineId = line;

        var payment = await _service.GetByScheduleAsync(
            scheduleId,
            UserId,
            role ?? string.Empty,
            depotId,
            shippingLineId,
            cancellationToken);

        return new JsonResult(payment) { StatusCode = StatusCodes.Status200OK };
    }

    [HttpPut("{id:int}/proof-metadata")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<PaymentDto>> UpdateProofMetadata(
        int id,
        [FromBody] UpdatePaymentProofMetadataRequest request,
        CancellationToken cancellationToken)
    {
        var payment = await _service.UpdateProofMetadataAsync(id, request, UserId, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }

    [HttpPost("{id:int}/extract-proof")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<PaymentDto>> ExtractProofMetadata(int id, CancellationToken cancellationToken)
    {
        var updated = await _service.ExtractProofMetadataAsync(id, _env.ContentRootPath, UserId, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpGet("{id:int}/proof-file")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> DownloadProofFile(int id, CancellationToken cancellationToken)
    {
        var file = await _service.GetProofFileAsync(id, _env.ContentRootPath, cancellationToken);
        if (file is null)
            return NotFound();

        return PhysicalFile(file.AbsolutePath, file.ContentType, file.FileName);
    }

    [HttpPost("{id:int}/verify")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<PaymentDto>> Verify(
        int id,
        [FromBody] VerifyPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var payment = await _service.VerifyAsync(id, request, UserId, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }
}
