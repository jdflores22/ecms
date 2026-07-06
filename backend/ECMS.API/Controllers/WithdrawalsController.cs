using System.Security.Claims;
using ECMS.Application.DTOs.Withdrawal;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/withdrawals")]
[Authorize]
public class WithdrawalsController : ControllerBase
{
    private readonly IWithdrawalService _service;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf",
    };

    public WithdrawalsController(
        IWithdrawalService service,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _service = service;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WithdrawalDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, Role, cancellationToken));

    [HttpGet("pending-review/count")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<object>> PendingReviewCount(CancellationToken cancellationToken)
        => Ok(new { count = await _service.GetPendingReviewCountAsync(UserId, Role, cancellationToken) });

    [HttpGet("pending-action/count")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<object>> PendingActionCount(CancellationToken cancellationToken)
        => Ok(new { count = await _service.GetPendingActionCountAsync(UserId, Role, cancellationToken) });

    [HttpGet("evaluator-lookups")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<EvaluatorAtwLookupsDto>> EvaluatorLookups(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetEvaluatorLookupsAsync(UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("awaiting-cy/count")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<object>> AwaitingCyCount(CancellationToken cancellationToken)
        => Ok(new { count = await _service.GetAwaitingCyCountAsync(UserId, Role, cancellationToken) });

    [HttpGet("awaiting-schedule/count")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<object>> AwaitingScheduleCount(CancellationToken cancellationToken)
        => Ok(new { count = await _service.GetAwaitingScheduleCountAsync(UserId, Role, cancellationToken) });

    [HttpGet("awaiting-cy")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<IReadOnlyList<WithdrawalDto>>> AwaitingCy(CancellationToken cancellationToken)
        => Ok(await _service.GetAwaitingCyAsync(UserId, Role, cancellationToken));

    [HttpGet("awaiting-schedule")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<IReadOnlyList<WithdrawalDto>>> AwaitingSchedule(CancellationToken cancellationToken)
        => Ok(await _service.GetAwaitingScheduleAsync(UserId, Role, cancellationToken));

    [HttpGet("schedules/mine")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<IReadOnlyList<WithdrawalScheduleDto>>> MySchedules(CancellationToken cancellationToken)
        => Ok(await _service.GetMySchedulesAsync(UserId, Role, cancellationToken));

    [HttpGet("next-booking-number")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalBookingNumberPreviewDto>> NextBookingNumber(CancellationToken cancellationToken)
        => Ok(await _service.GetNextBookingNumberAsync(cancellationToken));

    [HttpPost("book")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalDto>> Book([FromBody] BookWithdrawalRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.BookAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/assign-cy")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<WithdrawalDto>> AssignCy(
        int id,
        [FromBody] AssignCyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.AssignCyAsync(id, request, UserId, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/schedule")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<WithdrawalDto>> SchedulePickup(
        int id,
        [FromBody] ScheduleWithdrawalPickupRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.SchedulePickupAsync(id, request, UserId, Role, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("schedules/{scheduleId:int}")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<WithdrawalScheduleDto>> UpdateSchedule(
        int scheduleId,
        [FromBody] UpdateWithdrawalScheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateScheduleAsync(scheduleId, request, UserId, Role, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("issue")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<WithdrawalDto>> Issue([FromBody] IssueAtwRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.IssueAtwAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<WithdrawalDto>> Approve(
        int id,
        [FromBody] ReviewWithdrawalRequest? request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.ApproveAsync(id, UserId, Role, request?.Remarks, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<WithdrawalDto>> Reject(
        int id,
        [FromBody] RejectWithdrawalRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.RejectAsync(id, UserId, Role, request.Remarks, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/release")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<WithdrawalDto>> Release(int id, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.ReleaseAsync(id, UserId, Role, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/lines/{lineId:int}/release")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<WithdrawalDto>> ReleaseLine(int id, int lineId, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.ReleaseLineAsync(id, lineId, UserId, Role, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("lookups")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalLookupsDto>> Lookups(CancellationToken cancellationToken)
        => Ok(await _service.GetLookupsAsync(cancellationToken));

    [HttpGet("form-config")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalFormConfigDto>> FormConfig(CancellationToken cancellationToken)
        => Ok(await _service.GetFormConfigAsync(cancellationToken));

    [HttpGet("check-atw-number")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalAtwNumberCheckDto>> CheckAtwNumber(
        [FromQuery] string atwNumber,
        [FromQuery] int? excludeWithdrawalId,
        CancellationToken cancellationToken)
        => Ok(await _service.CheckAtwNumberAsync(atwNumber, excludeWithdrawalId, cancellationToken));

    [HttpGet("check-yard")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalYardCheckDto>> CheckYard(
        [FromQuery] int depotId,
        [FromQuery] int shippingLineId,
        [FromQuery] string containerNo,
        [FromQuery] int containerSizeId,
        [FromQuery] int containerTypeId,
        CancellationToken cancellationToken)
        => Ok(await _service.CheckContainerInYardAsync(
            depotId, shippingLineId, containerNo, containerSizeId, containerTypeId, cancellationToken));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<IActionResult> DeleteDraft(int id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteDraftAsync(id, UserId, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/gate-pass")]
    public async Task<ActionResult<WithdrawalGatePassDto>> GatePass(int id, CancellationToken cancellationToken)
    {
        var pass = await _service.GetGatePassAsync(id, UserId, Role, cancellationToken);
        return pass is null ? NotFound() : Ok(pass);
    }

    [HttpGet("check-duplicate")]
    [Authorize(Roles = RoleNames.PreAdviceManager + "," + RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<WithdrawalDuplicateCheckDto>> CheckDuplicate(
        [FromQuery] int currentDepotId,
        [FromQuery] string containerNo,
        [FromQuery] int containerSizeId,
        [FromQuery] int containerTypeId,
        [FromQuery] int? excludeWithdrawalId,
        CancellationToken cancellationToken)
        => Ok(await _service.CheckDuplicateAsync(
            new CheckWithdrawalDuplicateRequest(
                currentDepotId,
                containerNo,
                containerSizeId,
                containerTypeId,
                excludeWithdrawalId),
            cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<WithdrawalDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalDto>> Create([FromBody] CreateWithdrawalRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CreateAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalDto>> Update(int id, [FromBody] UpdateWithdrawalRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateAsync(id, request, UserId, Role, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/submit")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<ActionResult<WithdrawalDto>> Submit(int id, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.SubmitAsync(id, UserId, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/documents")]
    public async Task<ActionResult<IReadOnlyList<WithdrawalDocumentDto>>> GetDocuments(int id, CancellationToken cancellationToken)
    {
        var documents = await _service.GetDocumentsAsync(id, UserId, Role, cancellationToken);
        if (documents.Count == 0 && await _service.GetByIdAsync(id, UserId, Role, cancellationToken) is null)
            return NotFound();
        return Ok(documents);
    }

    [HttpPost("{id:int}/documents")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<WithdrawalDocumentDto>> UploadDocument(
        int id,
        IFormFile file,
        [FromForm] string? documentType,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "File is required." });

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            return BadRequest(new { message = "Allowed files: PDF, JPG, PNG, WEBP." });

        var parsedType = WithdrawalDocumentType.AtwCertificate;
        if (!string.IsNullOrWhiteSpace(documentType)
            && Enum.TryParse<WithdrawalDocumentType>(documentType, true, out var dt))
        {
            parsedType = dt;
        }

        var uploadDir = Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");
        Directory.CreateDirectory(uploadDir);

        var storedName = $"{Guid.NewGuid()}{extension}";
        var physicalPath = Path.Combine(uploadDir, storedName);

        await using (var stream = System.IO.File.Create(physicalPath))
            await file.CopyToAsync(stream, cancellationToken);

        try
        {
            var document = await _service.AddDocumentAsync(
                id,
                UserId,
                Role,
                parsedType,
                file.FileName,
                $"/uploads/{storedName}",
                file.ContentType,
                file.Length,
                cancellationToken);
            return Ok(document);
        }
        catch (InvalidOperationException ex)
        {
            System.IO.File.Delete(physicalPath);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}/documents/{documentId:int}")]
    [Authorize(Roles = RoleNames.PreAdviceManager)]
    public async Task<IActionResult> DeleteDocument(int id, int documentId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteDocumentAsync(id, documentId, UserId, Role, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
