using System.Security.Claims;
using ECMS.Application.DTOs.ShippingLineCyFill;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/shipping-line-cy-fill")]
[Authorize]
public class ShippingLineCyFillController : ControllerBase
{
    private readonly IShippingLineCyFillService _service;

    public ShippingLineCyFillController(IShippingLineCyFillService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineCyFillSettingsDto>> GetSettings(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetSettingsAsync(UserId, Role, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPut("strategy")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineCyFillSettingsDto>> UpdateStrategy(
        [FromBody] UpdateCyFillStrategyRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.UpdateStrategyAsync(request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("priorities")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineCyFillSettingsDto>> UpdatePriorities(
        [FromBody] UpdateCyFillPrioritiesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.UpdatePrioritiesAsync(request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("daily")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineCyFillSettingsDto>> SetDaily(
        [FromBody] SetDailyDepotFillRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.SetDailyAssignmentAsync(request, UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("recommended/{shippingLineId:int}")]
    [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.ShippingLineEvaluator}")]
    public async Task<ActionResult<RecommendedDepotOrderDto>> GetRecommended(
        int shippingLineId,
        [FromQuery] DateOnly? date,
        CancellationToken cancellationToken)
    {
        try
        {
            var effectiveDate = date ?? DateOnly.FromDateTime(
                TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Domain.Common.PhilippinesTime.Zone));
            return Ok(await _service.GetRecommendedDepotOrderAsync(
                shippingLineId, effectiveDate, UserId, Role, cancellationToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }
}
