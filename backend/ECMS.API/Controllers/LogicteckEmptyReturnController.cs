using System.Security.Claims;
using System.Text.Json;
using ECMS.Application.DTOs.Logicteck;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/logicteck/empty-return")]
[Authorize]
public class LogicteckEmptyReturnController : ControllerBase
{
    private readonly ILogicteckEmptyReturnService _service;

    public LogicteckEmptyReturnController(ILogicteckEmptyReturnService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("submit")]
    [RequestSizeLimit(80 * 1024 * 1024)]
    public async Task<ActionResult<LogicteckEmptyReturnSubmitResponse>> Submit(CancellationToken cancellationToken)
    {
        var form = HttpContext.Request.Form;

        var damageViewsJson = form["damageViews"].FirstOrDefault() ?? "[]";
        IReadOnlyList<LogicteckEmptyReturnDamageViewState> damageViews;
        try
        {
            damageViews = JsonSerializer.Deserialize<List<LogicteckEmptyReturnDamageViewState>>(damageViewsJson)
                ?? new List<LogicteckEmptyReturnDamageViewState>();
        }
        catch (JsonException)
        {
            return BadRequest(new LogicteckEmptyReturnSubmitResponse(false, "Invalid damageViews JSON.", null, false, null, null));
        }

        var plateDifferent = bool.TryParse(form["plateNumberDifferent"].FirstOrDefault(), out var pd) && pd;
        var platePrefix = form["platePrefix"].FirstOrDefault()?.Trim().ToUpperInvariant();
        var plateSuffix = form["plateSuffix"].FirstOrDefault()?.Trim();
        var alternatePlate = form["plateNumber"].FirstOrDefault()?.Trim().ToUpperInvariant();
        var plateNumber = plateDifferent
            ? alternatePlate
            : string.Concat(platePrefix, plateSuffix).Trim().ToUpperInvariant();

        var request = new LogicteckEmptyReturnSubmitRequest(
            form["driverName"].FirstOrDefault() ?? "",
            form["licenseNumber"].FirstOrDefault() ?? "",
            plateDifferent,
            plateNumber,
            form["shippingLine"].FirstOrDefault() ?? "",
            form["blNumber"].FirstOrDefault(),
            form["containerSize"].FirstOrDefault() ?? "",
            form["containerType"].FirstOrDefault() ?? "",
            form["containerNumber"].FirstOrDefault() ?? "",
            form["returnDate"].FirstOrDefault() ?? "",
            form["returnTime"].FirstOrDefault() ?? "",
            form["damageDescription"].FirstOrDefault(),
            form["submitMode"].FirstOrDefault() ?? "submit",
            form["icsBookingReference"].FirstOrDefault(),
            damageViews);

        var files = new List<LogicteckEmptyReturnFileAttachment>();
        foreach (var file in form.Files)
        {
            if (file.Length <= 0) continue;

            await using var stream = file.OpenReadStream();
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms, cancellationToken);

            files.Add(new LogicteckEmptyReturnFileAttachment(
                file.Name,
                file.FileName,
                file.ContentType ?? "application/octet-stream",
                file.Length,
                Convert.ToBase64String(ms.ToArray())));
        }

        var result = await _service.SubmitAsync(request, files, UserId, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
