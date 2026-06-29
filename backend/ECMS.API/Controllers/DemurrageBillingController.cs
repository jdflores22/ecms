using System.Security.Claims;
using ECMS.Application.DTOs.DemurrageBilling;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/demurrage-billing")]
[Authorize]
public class DemurrageBillingController : ControllerBase
{
    private readonly IDemurrageBillingService _service;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public DemurrageBillingController(
        IDemurrageBillingService service,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _service = service;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string UserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;

    private string UploadDirectory =>
        Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DemurrageBillingDto>>> List(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, UserRole, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DemurrageBillingDto>> Get(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, UserRole, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("eligible-pre-forecasts")]
    [HttpGet("eligible-pre-advices")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<IReadOnlyList<EligibleDemurragePreAdviceDto>>> EligiblePreAdvices(
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetEligiblePreAdvicesAsync(UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<DemurrageBillingDto>> Create(
        [FromBody] CreateDemurrageBillingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CreateAsync(request, UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}/fees")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<DemurrageBillingDto>> UpdateFees(
        int id,
        [FromBody] UpdateDemurrageBillingFeesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateFeesAsync(id, request, UserId, UserRole, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("check-block")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<DemurrageBlockCheckDto>> CheckBlock(
        [FromQuery] string containerNo,
        [FromQuery] int shippingLineId,
        [FromQuery] int containerSizeId,
        [FromQuery] int containerTypeId,
        CancellationToken cancellationToken)
        => Ok(await _service.CheckBlockAsync(
            UserId,
            containerNo,
            shippingLineId,
            containerSizeId,
            containerTypeId,
            cancellationToken));

    [HttpPost("{id:int}/upload-proof")]
    [Authorize(Roles = RoleNames.Trucker)]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<DemurrageBillingDto>> UploadProof(
        int id,
        IFormFile proof,
        [FromForm] string? proofReferenceNo,
        [FromForm] string? proofTransactionAt,
        CancellationToken cancellationToken)
    {
        if (proof is null || proof.Length == 0)
            return BadRequest(new { message = "Proof file is required." });

        Directory.CreateDirectory(UploadDirectory);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(proof.FileName)}";
        var filePath = Path.Combine(UploadDirectory, fileName);
        var webPath = $"/uploads/{fileName}";

        await using (var stream = System.IO.File.Create(filePath))
            await proof.CopyToAsync(stream, cancellationToken);

        DateTime? parsedAt = null;
        if (!string.IsNullOrWhiteSpace(proofTransactionAt)
            && DateTime.TryParse(proofTransactionAt, out var dt))
            parsedAt = dt;

        try
        {
            return Ok(await _service.UploadProofAsync(
                id,
                UserId,
                webPath,
                filePath,
                proofReferenceNo,
                parsedAt,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/verify")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<DemurrageBillingDto>> Verify(
        int id,
        [FromBody] VerifyDemurrageBillingRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _service.VerifyAsync(id, request, UserId, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }
}
