using System.Security.Claims;
using ECMS.Application.DTOs.ContainerInventory;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/container-inventory")]
[Authorize(Roles = RoleNames.ShippingLineEvaluator)]
public class ContainerInventoryController : ControllerBase
{
    private readonly IContainerInventoryService _service;

    public ContainerInventoryController(IContainerInventoryService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<ContainerInventoryResponseDto>> GetAll(
        [FromQuery] int? depotId,
        [FromQuery] int? shippingLineId,
        [FromQuery] string? compliance,
        [FromQuery] string? yardStatus,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetInventoryAsync(
                UserId,
                Role,
                depotId,
                shippingLineId,
                compliance,
                yardStatus,
                cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("manual")]
    public async Task<ActionResult<ManualYardInventoryEntryDto>> CreateManual(
        [FromBody] CreateManualYardInventoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CreateManualEntryAsync(request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("manual/bulk")]
    public async Task<ActionResult<BulkCreateManualYardInventoryResponse>> BulkCreateManual(
        [FromBody] BulkCreateManualYardInventoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.BulkCreateManualEntriesAsync(request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("manual/{id:int}")]
    public async Task<IActionResult> DeleteManual(int id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteManualEntryAsync(id, UserId, Role, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
