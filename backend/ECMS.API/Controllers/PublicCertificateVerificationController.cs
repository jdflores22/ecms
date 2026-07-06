using ECMS.Application.DTOs.Certificate;
using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/public/certificates")]
[AllowAnonymous]
public class PublicCertificateVerificationController : ControllerBase
{
    private readonly ICertificateVerificationService _verification;

    public PublicCertificateVerificationController(ICertificateVerificationService verification)
    {
        _verification = verification;
    }

    /// <summary>
    /// Public read-only verification for certificate QR codes. No authentication required.
    /// </summary>
    [HttpGet("verify/{token}")]
    [EnableRateLimiting("cert-verify")]
    [ProducesResponseType(typeof(CertificateVerificationResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CertificateVerificationResponseDto>> Verify(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return Ok(new CertificateVerificationResponseDto(
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
                null,
                null,
                false));
        }

        var result = await _verification.VerifyPublicAsync(token, cancellationToken);
        return Ok(result);
    }
}
