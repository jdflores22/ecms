using ECMS.Application.DTOs.ContainerReleaseOrder;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/public/cro-edo")]
[AllowAnonymous]
public class PublicCroEdoVerificationController : ControllerBase
{
    private readonly IContainerReleaseOrderService _service;

    public PublicCroEdoVerificationController(IContainerReleaseOrderService service)
    {
        _service = service;
    }

    /// <summary>
    /// Public read-only verification for CRO/eDO QR codes. No authentication required.
    /// </summary>
    [HttpGet("verify/{token}")]
    [EnableRateLimiting("cert-verify")]
    [ProducesResponseType(typeof(CroEdoVerificationResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CroEdoVerificationResponseDto>> Verify(
        string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return Ok(new CroEdoVerificationResponseDto(
                false,
                "not_found",
                "This document could not be verified. The QR code may be invalid, expired, or not issued by ICS.",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null));
        }

        return Ok(await _service.VerifyPublicAsync(token, cancellationToken));
    }
}
