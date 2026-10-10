using System.Security.Claims;
using ECMS.API.Security;
using ECMS.Application.DTOs.Portal;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/portal/settings")]
[Authorize]
public class PortalSettingsController : ControllerBase
{
    private readonly IPortalSettingsService _settings;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    public PortalSettingsController(
        IPortalSettingsService settings,
        IConfiguration configuration,
        IWebHostEnvironment env)
    {
        _settings = settings;
        _configuration = configuration;
        _env = env;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<PortalSettingsDto>> Get(CancellationToken cancellationToken)
        => Ok(await _settings.GetAsync(cancellationToken));

    [HttpPut]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<PortalSettingsDto>> Update(
        [FromBody] UpdatePortalSettingsRequest request,
        CancellationToken cancellationToken)
    {
        PaymentSettingsDeveloperGate.Validate(_configuration, _env, request.DeveloperPassword);
        return Ok(await _settings.UpdateAsync(request, UserId, cancellationToken));
    }
}
