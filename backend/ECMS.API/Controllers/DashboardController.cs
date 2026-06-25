using System.Security.Claims;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;

    public DashboardController(IDashboardService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("shipping-line")]
    [Authorize(Roles = RoleNames.ShippingLineEvaluator)]
    public async Task<IActionResult> ShippingLine(CancellationToken cancellationToken)
        => Ok(await _service.GetShippingLineDashboardAsync(UserId, cancellationToken));

    [HttpGet("depot")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<IActionResult> Depot(CancellationToken cancellationToken)
    {
        var depotId = int.Parse(User.FindFirstValue("depotId") ?? "0");
        if (depotId == 0) return BadRequest(new { message = "Depot not assigned to user." });
        return Ok(await _service.GetDepotDashboardAsync(depotId, cancellationToken));
    }

    [HttpGet("trucker")]
    [Authorize(Roles = RoleNames.Trucker)]
    public async Task<IActionResult> Trucker(CancellationToken cancellationToken)
        => Ok(await _service.GetTruckerDashboardAsync(UserId, cancellationToken));

    [HttpGet("admin")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<IActionResult> Admin(CancellationToken cancellationToken)
        => Ok(await _service.GetAdminDashboardAsync(cancellationToken));
}
