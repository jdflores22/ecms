using System.Security.Claims;
using ECMS.Application.DTOs.Schedule;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/schedules")]
[Authorize]
public class SchedulesController : ControllerBase
{
    private readonly IScheduleService _service;

    public SchedulesController(IScheduleService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ScheduleDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await _service.GetAllAsync(UserId, Role, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ScheduleDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("by-preforecast/{preAdviceId:int}")]
    [HttpGet("by-preadvice/{preAdviceId:int}")]
    public async Task<ActionResult<ScheduleDto>> GetByPreAdvice(int preAdviceId, CancellationToken cancellationToken)
    {
        var item = await _service.GetByPreAdviceIdAsync(preAdviceId, UserId, Role, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("slots")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<SlotAvailabilityDto>> GetSlots(
        [FromQuery] int depotId,
        [FromQuery] DateOnly date,
        [FromQuery] int? excludeScheduleId,
        CancellationToken cancellationToken)
        => Ok(await _service.GetSlotAvailabilityAsync(depotId, date, excludeScheduleId, cancellationToken));

    [HttpGet("waiting/count")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<ECMS.Application.DTOs.Common.CountDto>> GetWaitingCount(CancellationToken cancellationToken)
        => Ok(new ECMS.Application.DTOs.Common.CountDto(await _service.GetWaitingScheduleCountAsync(UserId, Role, cancellationToken)));

    [HttpPost]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<ScheduleDto>> Create([FromBody] CreateScheduleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.CreateAsync(request, UserId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.DepotPersonnel)]
    public async Task<ActionResult<ScheduleDto>> Update(int id, [FromBody] UpdateScheduleRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var item = await _service.UpdateAsync(id, request, UserId, cancellationToken);
            return item is null ? NotFound() : Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
