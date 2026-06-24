using System.Security.Claims;
using ECMS.Application.DTOs.ShippingLine;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/shipping-lines")]
[Authorize(Roles = RoleNames.Administrator)]
public class ShippingLinesController : ControllerBase
{
    private readonly IShippingLineService _service;

    public ShippingLinesController(IShippingLineService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShippingLineDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ShippingLineDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ShippingLineDto>> Create(
        [FromBody] CreateShippingLineRequest request,
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
    public async Task<ActionResult<ShippingLineDto>> Update(
        int id,
        [FromBody] UpdateShippingLineRequest request,
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
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var deactivated = await _service.DeactivateAsync(id, UserId, cancellationToken);
        return deactivated ? NoContent() : NotFound();
    }
}
