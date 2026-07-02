using System.Security.Claims;
using ECMS.Application.DTOs.Notification;
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
    private readonly IPushNotificationService _push;

    public NotificationsController(INotificationService service, IPushNotificationService push)
    {
        _service = service;
        _push = push;
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

    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPushToken(
        [FromBody] RegisterPushTokenRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Push token is required." });

        await _push.RegisterTokenAsync(
            UserId,
            request.Token,
            request.Platform,
            request.DeviceName,
            cancellationToken);

        return NoContent();
    }

    [HttpDelete("push-token")]
    public async Task<IActionResult> UnregisterPushToken(
        [FromBody] UnregisterPushTokenRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "Push token is required." });

        await _push.UnregisterTokenAsync(UserId, request.Token, cancellationToken);
        return NoContent();
    }
}
