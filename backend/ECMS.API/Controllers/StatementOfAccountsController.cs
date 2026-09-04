using System.Security.Claims;
using ECMS.Application.DTOs.Common;
using ECMS.Application.DTOs.StatementOfAccount;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/statement-of-accounts")]
[Authorize]
public class StatementOfAccountsController : ControllerBase
{
    private readonly IStatementOfAccountService _service;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public StatementOfAccountsController(
        IStatementOfAccountService service,
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

    [HttpGet("credit-line")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineCreditLineDto>> GetCreditLine(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetOrCreateCreditLineAsync(UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("credit-line")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineCreditLineDto>> UpdateCreditLine(
        [FromBody] UpdateShippingLineCreditLineRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.UpdateCreditLineAsync(request, UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("eligible-truckers")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<IReadOnlyList<SoaTruckerRegisterDto>>> EligibleTruckers(
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetEligibleTruckerRegisterAsync(UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("eligible-billings")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<IReadOnlyList<EligibleSoaBillingDto>>> EligibleBillings(
        [FromQuery] int? truckerId,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetEligibleBillingsAsync(truckerId, UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StatementOfAccountDto>>> List(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, UserRole, cancellationToken));

    [HttpGet("payment-due/count")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<ActionResult<CountDto>> PaymentDueCount(CancellationToken cancellationToken)
        => Ok(new CountDto(await _service.GetPaymentDueCountAsync(UserId, UserRole, cancellationToken)));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StatementOfAccountDto>> Get(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, UserRole, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<StatementOfAccountDto>> Create(
        [FromBody] CreateStatementOfAccountRequest request,
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

    [HttpPost("{id:int}/issue")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<StatementOfAccountDto>> Issue(
        int id,
        [FromBody] IssueStatementOfAccountRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.IssueAsync(id, request, UserId, UserRole, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<StatementOfAccountDto>> Cancel(int id, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.CancelAsync(id, UserId, UserRole, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/upload-proof")]
    [Authorize(Roles = RoleNames.Trucker)]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<StatementOfAccountDto>> UploadProof(
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
        if (!string.IsNullOrWhiteSpace(proofTransactionAt) && DateTime.TryParse(proofTransactionAt, out var dt))
            parsedAt = dt;

        try
        {
            var item = await _service.UploadProofAsync(
                id, UserId, webPath, proofReferenceNo, parsedAt, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/verify")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<StatementOfAccountDto>> Verify(
        int id,
        [FromBody] VerifyStatementOfAccountRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.VerifyAsync(id, request, UserId, UserRole, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
