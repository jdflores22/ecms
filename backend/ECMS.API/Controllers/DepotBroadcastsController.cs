using System.Security.Claims;
using ECMS.Application.DTOs.Depot;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/depot/broadcasts")]
[Authorize(Roles = RoleNames.DepotPersonnel)]
public class DepotBroadcastsController : ControllerBase
{
    private readonly IDepotBroadcastService _broadcasts;

    public DepotBroadcastsController(IDepotBroadcastService broadcasts)
    {
        _broadcasts = broadcasts;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DepotBroadcastDto>>> GetHistory(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _broadcasts.GetHistoryAsync(UserId, Role, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<DepotBroadcastDto>> Send(
        [FromBody] CreateDepotBroadcastRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _broadcasts.SendAsync(UserId, Role, request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
