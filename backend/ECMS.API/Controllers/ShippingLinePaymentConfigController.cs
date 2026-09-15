using System.Security.Claims;
using ECMS.Application.DTOs.ShippingLine;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/shipping-line-payment-config")]
[Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.ShippingLineEvaluator}")]
public class ShippingLinePaymentConfigController : ControllerBase
{
    private readonly IShippingLinePaymentConfigService _service;

    public ShippingLinePaymentConfigController(IShippingLinePaymentConfigService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string UserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;

    [HttpGet("{shippingLineId:int}")]
    public async Task<ActionResult<ShippingLinePaymentConfigDto>> Get(int shippingLineId, CancellationToken cancellationToken)
    {
        var item = await _service.GetAsync(shippingLineId, UserId, UserRole, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("{shippingLineId:int}")]
    public async Task<ActionResult<ShippingLinePaymentConfigDto>> Update(
        int shippingLineId,
        [FromBody] UpdateShippingLinePaymentConfigRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateAsync(shippingLineId, request, UserId, UserRole, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
