using System.Security.Claims;
using ECMS.Application.DTOs.Container;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/containers")]
[Authorize(Roles = RoleNames.Administrator)]
public class ContainersController : ControllerBase
{
    private readonly IContainerService _service;

    public ContainersController(IContainerService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ContainerDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContainerDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ContainerDto>> Create(
        [FromBody] CreateContainerRequest request,
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
    public async Task<ActionResult<ContainerDto>> Update(
        int id,
        [FromBody] UpdateContainerRequest request,
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
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id, UserId, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
