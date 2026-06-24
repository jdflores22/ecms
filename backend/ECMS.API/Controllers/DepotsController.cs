using System.Security.Claims;
using ECMS.Application.DTOs.Depot;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/depots")]
[Authorize]
public class DepotsController : ControllerBase
{
    private readonly IDepotService _service;

    public DepotsController(IDepotService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DepotDto>>> GetActive(CancellationToken cancellationToken)
        => Ok(await _service.GetActiveAsync(cancellationToken));

    [HttpGet("admin")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<IReadOnlyList<DepotDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<DepotDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<DepotDto>> Create(
        [FromBody] CreateDepotRequest request,
        CancellationToken cancellationToken)
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
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<DepotDto>> Update(
        int id,
        [FromBody] UpdateDepotRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateAsync(id, request, UserId, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var deactivated = await _service.DeactivateAsync(id, UserId, cancellationToken);
        return deactivated ? NoContent() : NotFound();
    }
}
