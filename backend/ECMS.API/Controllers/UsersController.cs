using System.Security.Claims;
using ECMS.Application.DTOs.User;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _service;

    public UsersController(IUserService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("truckers")]
    [Authorize(Roles = RoleNames.DepotPersonnel + "," + RoleNames.Administrator)]
    public async Task<IActionResult> GetTruckers(CancellationToken cancellationToken)
        => Ok(await _service.GetTruckersAsync(cancellationToken));

    [HttpGet]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(cancellationToken));

    [HttpGet("lookups")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
        => Ok(await _service.GetAdminLookupsAsync(cancellationToken));

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var user = await _service.UpdateAsync(id, request, UserId, cancellationToken);
            return user is null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
