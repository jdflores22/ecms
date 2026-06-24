using System.Security.Claims;
using ECMS.Application.DTOs.Role;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _service;

    public RolesController(IRoleService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("access")]
    public async Task<IActionResult> GetMyAccess(CancellationToken cancellationToken)
    {
        var roleName = User.FindFirstValue(ClaimTypes.Role);
        if (string.IsNullOrWhiteSpace(roleName))
            return Unauthorized();

        var access = await _service.GetAccessForRoleAsync(roleName, cancellationToken);
        return access is null ? NotFound() : Ok(access);
    }

    [HttpGet]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpPut("{name}")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> Update(string name, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var role = await _service.UpdateAsync(name, request, UserId, cancellationToken);
            return role is null ? NotFound() : Ok(role);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
