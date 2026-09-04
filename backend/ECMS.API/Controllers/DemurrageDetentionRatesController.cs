using System.Security.Claims;
using ECMS.Application.DTOs.DemurrageDetentionRate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/demurrage-detention-rates")]
[Authorize(Roles = RoleNames.ShippingLineEvaluator)]
public class DemurrageDetentionRatesController : ControllerBase
{
    private readonly IDemurrageDetentionRateService _service;

    public DemurrageDetentionRatesController(IDemurrageDetentionRateService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string UserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DemurrageDetentionRateDto>>> List(
        [FromQuery] int? shippingLineId,
        CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, UserRole, shippingLineId, cancellationToken));

    [HttpGet("resolve")]
    public async Task<ActionResult<ResolvedDemurrageDetentionRateDto>> Resolve(
        [FromQuery] int shippingLineId,
        [FromQuery] int? depotId,
        [FromQuery] int? containerSizeId,
        [FromQuery] DateOnly? asOf,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ResolveAsync(shippingLineId, depotId, containerSizeId, asOf, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DemurrageDetentionRateDto>> Get(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, UserRole, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<DemurrageDetentionRateDto>> Create(
        [FromBody] UpsertDemurrageDetentionRateRequest request,
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

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DemurrageDetentionRateDto>> Update(
        int id,
        [FromBody] UpsertDemurrageDetentionRateRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateAsync(id, request, UserId, UserRole, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var ok = await _service.DeactivateAsync(id, UserId, UserRole, cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
