using System.Security.Claims;
using ECMS.Application.DTOs.User;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _service;

    public ProfileController(IProfileService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get(CancellationToken cancellationToken)
    {
        var profile = await _service.GetAsync(UserId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<ActionResult<ProfileDto>> Update(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var profile = await _service.UpdateAsync(UserId, request, cancellationToken);
            return profile is null ? NotFound() : Ok(profile);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _service.ChangePasswordAsync(UserId, request, cancellationToken);
            return Ok(new { message = "Password updated successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
