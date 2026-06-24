using ECMS.Application.DTOs.Audit;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = RoleNames.Administrator)]
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AuditController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<AuditLogPageDto>> Get(
        [FromQuery] int? userId,
        [FromQuery] string? module,
        [FromQuery] string? action,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _auditService.QueryAsync(
            new AuditLogQuery(userId, module, action, from, to, page, pageSize),
            cancellationToken);

        return Ok(result);
    }
}
