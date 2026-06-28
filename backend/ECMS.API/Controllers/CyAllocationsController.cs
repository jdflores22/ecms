using System.Security.Claims;
using ECMS.Application.DTOs.CyAllocation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/cy-allocations")]
[Authorize(Roles = RoleNames.ShippingLineEvaluator)]
public class CyAllocationsController : ControllerBase
{
    private readonly ICyAllocationService _service;

    public CyAllocationsController(ICyAllocationService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CyAllocationDto>>> GetAll(
        [FromQuery] int? shippingLineId,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetAllocationsAsync(shippingLineId, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("for-approval/{preAdviceId:int}")]
    public async Task<ActionResult<CyAllocationForApprovalDto>> GetForApproval(
        int preAdviceId,
        CancellationToken cancellationToken)
    {
        var item = await _service.GetForApprovalAsync(preAdviceId, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("contracts/{contractId:int}")]
    public async Task<ActionResult<CyAllocationDto>> UpdateContract(
        int contractId,
        [FromBody] UpdateShippingLineDepotContractRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.UpdateContractAsync(contractId, request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
