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
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public PaymentsController(IPaymentService service, IWebHostEnvironment env, IConfiguration configuration)
    {
        _service = service;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static string? UserRole(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role");

    [HttpPost("upload")]
    [Authorize(Roles = RoleNames.Trucker)]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<PaymentDto>> Upload(
        [FromForm] int scheduleId,
        [FromForm] decimal amount,
        IFormFile proof,
        CancellationToken cancellationToken)
    {
        if (proof is null || proof.Length == 0)
            return BadRequest(new { message = "Proof file is required." });

        var uploadDir = Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");
        Directory.CreateDirectory(uploadDir);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(proof.FileName)}";
        var filePath = Path.Combine(uploadDir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await proof.CopyToAsync(stream, cancellationToken);

        var relativePath = $"/uploads/{fileName}";
        return Ok(await _service.UploadProofAsync(new UploadPaymentRequest(scheduleId, amount), UserId, relativePath, cancellationToken));
    }

    [HttpGet("status/{id:int}")]
    public async Task<ActionResult<PaymentStatusDto>> GetStatus(int id, CancellationToken cancellationToken)
    {
        var status = await _service.GetStatusAsync(id, cancellationToken);
        return status is null ? NotFound() : Ok(status);
    }

    [HttpGet("mine")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetMine(CancellationToken cancellationToken)
        => Ok(await _service.GetByTruckerAsync(UserId, cancellationToken));

    [HttpGet("pending")]
    [Authorize(Roles = RoleNames.DepotPersonnel + "," + RoleNames.Administrator)]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetPending(CancellationToken cancellationToken)
    {
        int? depotId = null;
        var depotClaim = User.FindFirstValue("depotId");
        if (User.IsInRole(RoleNames.DepotPersonnel) && int.TryParse(depotClaim, out var id))
            depotId = id;

        return Ok(await _service.GetPendingVerificationAsync(depotId, cancellationToken));
    }

    [HttpGet("depot")]
    [Authorize(Roles = RoleNames.DepotPersonnel + "," + RoleNames.Administrator)]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetDepot(CancellationToken cancellationToken)
    {
        int? depotId = null;
        var depotClaim = User.FindFirstValue("depotId");
        if (User.IsInRole(RoleNames.DepotPersonnel) && int.TryParse(depotClaim, out var id))
            depotId = id;

        return Ok(await _service.GetForDepotAsync(depotId, cancellationToken));
    }

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

        // 200 + null when no payment yet (normal before trucker uploads proof).
        return new JsonResult(payment) { StatusCode = StatusCodes.Status200OK };
    }

    [HttpPost("{id:int}/verify")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.DepotPersonnel)]
    public async Task<ActionResult<PaymentDto>> Verify(int id, [FromQuery] bool approved, CancellationToken cancellationToken)
    {
        var payment = await _service.VerifyAsync(id, approved, UserId, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }
}
