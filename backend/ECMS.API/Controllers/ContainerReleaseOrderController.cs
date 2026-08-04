using System.Security.Claims;
using ECMS.Application.DTOs.ContainerReleaseOrder;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/cro-edo")]
[Authorize(Roles = RoleNames.ShippingLineEvaluator)]
public class ContainerReleaseOrderController : ControllerBase
{
    private readonly IContainerReleaseOrderService _service;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _configuration;

    public ContainerReleaseOrderController(
        IContainerReleaseOrderService service,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _service = service;
        _env = env;
        _configuration = configuration;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string UserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;

    private string UploadDirectory =>
        Path.Combine(_env.ContentRootPath, _configuration["FileStorage:UploadPath"] ?? "uploads");

    private string? LogoPath
    {
        get
        {
            var configured = _configuration["Branding:LogoPath"];
            if (!string.IsNullOrWhiteSpace(configured))
            {
                var absolute = Path.IsPathRooted(configured)
                    ? configured
                    : Path.Combine(_env.ContentRootPath, configured);
                if (System.IO.File.Exists(absolute))
                    return absolute;
            }

            var fallback = Path.Combine(_env.ContentRootPath, "Assets", "ics-logo.png");
            return System.IO.File.Exists(fallback) ? fallback : null;
        }
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ContainerReleaseOrderDto>>> List(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, UserRole, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContainerReleaseOrderDto>> Get(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, UserRole, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ContainerReleaseOrderDto>> Create(
        [FromBody] CreateContainerReleaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _service.CreateAsync(request, UserId, UserRole, cancellationToken);
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ContainerReleaseOrderDto>> Update(
        int id,
        [FromBody] UpdateContainerReleaseOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.UpdateAsync(id, request, UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/issue")]
    public async Task<ActionResult<ContainerReleaseOrderDto>> Issue(int id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.IssueAsync(id, UserId, UserRole, UploadDirectory, LogoPath, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<ContainerReleaseOrderDto>> Cancel(int id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CancelAsync(id, UserId, UserRole, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:int}/regenerate-pdf")]
    public async Task<ActionResult<ContainerReleaseOrderDto>> RegeneratePdf(int id, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.RegeneratePdfAsync(id, UserId, UserRole, UploadDirectory, LogoPath, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> Pdf(int id, CancellationToken cancellationToken)
    {
        var pdf = await _service.GetPdfAsync(id, UserId, UserRole, UploadDirectory, cancellationToken);
        if (pdf is null)
            return NotFound(new { message = "PDF not found. Issue the CRO/eDO first." });

        return File(pdf.Value.Bytes, "application/pdf", pdf.Value.FileName);
    }
}
