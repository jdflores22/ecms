using System.Security.Claims;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _service;

    public NotificationsController(INotificationService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null,
        CancellationToken cancellationToken = default)
        => Ok(await _service.GetForUserAsync(UserId, page, pageSize, unreadOnly, cancellationToken));

    [HttpGet("unread-count")]
    public async Task<ActionResult> UnreadCount(CancellationToken cancellationToken)
        => Ok(new { count = await _service.GetUnreadCountAsync(UserId, cancellationToken) });

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken cancellationToken)
    {
        var ok = await _service.MarkReadAsync(UserId, id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        await _service.MarkAllReadAsync(UserId, cancellationToken);
        return NoContent();
    }
}
