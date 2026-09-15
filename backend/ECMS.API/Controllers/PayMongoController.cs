using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/paymongo")]
public class PayMongoController : ControllerBase
{
    private readonly IPayMongoService _payMongoService;

    public PayMongoController(IPayMongoService payMongoService)
    {
        _payMongoService = payMongoService;
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync(cancellationToken);
        var signature = Request.Headers["Paymongo-Signature"].ToString();

        var handled = await _payMongoService.HandleWebhookAsync(rawBody, signature, cancellationToken);
        return handled ? Ok() : BadRequest();
    }
}
