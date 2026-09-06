using System.Security.Claims;
using ECMS.Application.DTOs.DepotGate;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/depot/gate")]
[Authorize(Roles = $"{RoleNames.DepotPersonnel},{RoleNames.Administrator}")]
public class DepotGateController : ControllerBase
{
    private readonly IDepotGateService _service;

    public DepotGateController(IDepotGateService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    /// <summary>Validate a trucker booking QR and return gate eligibility for empty return.</summary>
    [HttpPost("scan")]
    public async Task<ActionResult<DepotGateScanResponse>> Scan(
        [FromBody] DepotGateScanRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.QrCode))
        {
            return BadRequest(new DepotGateScanResponse(
                false,
                "qrCode is required.",
                null,
                false,
                false,
                null,
                null,
                Array.Empty<DepotGateIssueDto>()));
        }

        return Ok(await _service.ScanAsync(request.QrCode, UserId, Role, cancellationToken));
    }

    /// <summary>Accept trucker at CY gate for empty return after QR validation.</summary>
    [HttpPost("check-in")]
    public async Task<ActionResult<DepotGateCheckInResponse>> CheckIn(
        [FromBody] DepotGateScanRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.QrCode))
        {
            return BadRequest(new DepotGateCheckInResponse(
                false,
                "qrCode is required.",
                null));
        }

        var result = await _service.CheckInAsync(request.QrCode, UserId, Role, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
