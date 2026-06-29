using System.Security.Claims;
using ECMS.Application.DTOs.Evaluation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/evaluations")]
[Authorize(Roles = RoleNames.ShippingLineEvaluator)]
public class EvaluationsController : ControllerBase
{
    private readonly IEvaluationService _service;

    public EvaluationsController(IEvaluationService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EvaluationDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, Role, cancellationToken));

    [HttpGet("by-preforecast/{preAdviceId:int}")]
    [HttpGet("by-preadvice/{preAdviceId:int}")]
    public async Task<ActionResult<EvaluationDto>> GetByPreAdvice(int preAdviceId, CancellationToken cancellationToken)
    {
        var item = await _service.GetByPreAdviceIdAsync(preAdviceId, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("approve")]
    public async Task<ActionResult<EvaluationDto>> Approve([FromBody] ApproveEvaluationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ApproveAsync(request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("reject")]
    public async Task<ActionResult<EvaluationDto>> Reject([FromBody] RejectEvaluationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.RejectAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("return-for-compliance")]
    public async Task<ActionResult<EvaluationDto>> ReturnForCompliance(
        [FromBody] ReturnForComplianceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ReturnForComplianceAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
