using System.Security.Claims;
using ECMS.Application.DTOs.Evaluation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/evaluations")]
[Authorize(Roles = RoleNames.ShippingLineEvaluator + "," + RoleNames.Administrator)]
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

    [HttpPost("approve")]
    public async Task<ActionResult<EvaluationDto>> Approve([FromBody] ApproveEvaluationRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ApproveAsync(request, UserId, cancellationToken));
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
}
