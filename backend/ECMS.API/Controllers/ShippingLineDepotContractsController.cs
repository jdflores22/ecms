using System.Security.Claims;
using ECMS.Application.DTOs.CyAllocation;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/shipping-line-depot-contracts")]
[Authorize(Roles = RoleNames.Administrator)]
public class ShippingLineDepotContractsController : ControllerBase
{
    private readonly IShippingLineDepotContractService _service;

    public ShippingLineDepotContractsController(IShippingLineDepotContractService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShippingLineDepotContractDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<ShippingLineDepotContractDto>> Create(
        [FromBody] CreateShippingLineDepotContractRequest request,
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
    public async Task<ActionResult<ShippingLineDepotContractDto>> Update(
        int id,
        [FromBody] UpdateShippingLineDepotContractRequest request,
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

    [HttpPost("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var ok = await _service.DeactivateAsync(id, UserId, cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
