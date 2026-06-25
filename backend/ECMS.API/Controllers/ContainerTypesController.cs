using System.Security.Claims;
using ECMS.Application.DTOs.ContainerCatalog;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/container-types")]
[Authorize]
public class ContainerTypesController : ControllerBase
{
    private readonly IContainerTypeService _service;

    public ContainerTypesController(IContainerTypeService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<IReadOnlyList<ContainerTypeDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpPost]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<ContainerTypeDto>> Create(
        [FromBody] CreateContainerTypeRequest request,
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
    public async Task<ActionResult<ContainerTypeDto>> Update(
        int id,
        [FromBody] UpdateContainerTypeRequest request,
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
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        var ok = await _service.DeactivateAsync(id, UserId, cancellationToken);
        return ok ? NoContent() : NotFound();
    }
}
