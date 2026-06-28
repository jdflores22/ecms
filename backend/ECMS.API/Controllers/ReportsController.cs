using System.Security.Claims;
using ECMS.Domain.Common;
using ECMS.Application.DTOs.Reports;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECMS.API.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;

    public ReportsController(IReportService service)
    {
        _service = service;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("returns/daily")]
    [Authorize(Roles =
        RoleNames.Administrator + "," +
        RoleNames.DepotPersonnel + "," +
        RoleNames.Trucker + "," +
        RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<DailyReturnReportDto>> DailyReturns(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? depotId,
        CancellationToken cancellationToken)
    {
        try
        {
            var today = PhilippinesTime.Today;
            var rangeFrom = from ?? today.AddDays(-30);
            var rangeTo = to ?? today;
            return Ok(await _service.GetDailyReturnsAsync(UserId, Role, rangeFrom, rangeTo, depotId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("returns/monthly")]
    [Authorize(Roles =
        RoleNames.Administrator + "," +
        RoleNames.DepotPersonnel + "," +
        RoleNames.Trucker + "," +
        RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<MonthlyReturnReportDto>> MonthlyReturns(
        [FromQuery] int? year,
        [FromQuery] int? depotId,
        CancellationToken cancellationToken)
    {
        try
        {
            var reportYear = year ?? PhilippinesTime.Year;
            return Ok(await _service.GetMonthlyReturnsAsync(UserId, Role, reportYear, depotId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("shipping-lines")]
    [Authorize(Roles =
        RoleNames.Administrator + "," +
        RoleNames.DepotPersonnel + "," +
        RoleNames.Trucker + "," +
        RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<ShippingLineReportDto>> ShippingLines(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? depotId,
        CancellationToken cancellationToken)
    {
        try
        {
            var today = PhilippinesTime.Today;
            var rangeFrom = from ?? today.AddDays(-30);
            var rangeTo = to ?? today;
            return Ok(await _service.GetShippingLineReportAsync(UserId, Role, rangeFrom, rangeTo, depotId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("depots")]
    [Authorize(Roles =
        RoleNames.Administrator + "," +
        RoleNames.DepotPersonnel + "," +
        RoleNames.Trucker + "," +
        RoleNames.ShippingLineEvaluator)]
    public async Task<ActionResult<DepotReportDto>> Depots(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int? depotId,
        CancellationToken cancellationToken)
    {
        try
        {
            var today = PhilippinesTime.Today;
            var rangeFrom = from ?? today.AddDays(-30);
            var rangeTo = to ?? today;
            return Ok(await _service.GetDepotReportAsync(UserId, Role, rangeFrom, rangeTo, depotId, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("revenue")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<RevenueReportDto>> Revenue(
        [FromQuery] string period = "monthly",
        [FromQuery] int? year = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _service.GetRevenueAsync(period, year, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("transactions")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<TransactionReportDto>> Transactions(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var today = PhilippinesTime.Today;
            var rangeFrom = from ?? today.AddDays(-30);
            var rangeTo = to ?? today;
            return Ok(await _service.GetTransactionsAsync(rangeFrom, rangeTo, page, pageSize, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("transactions/shipping-lines")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<TransactionShippingLineOverviewDto>> TransactionShippingLines(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var today = PhilippinesTime.Today;
            var rangeFrom = from ?? today.AddDays(-30);
            var rangeTo = to ?? today;
            return Ok(await _service.GetTransactionShippingLineOverviewAsync(rangeFrom, rangeTo, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("transactions/depots")]
    [Authorize(Roles = RoleNames.Administrator)]
    public async Task<ActionResult<TransactionDepotOverviewDto>> TransactionDepots(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var today = PhilippinesTime.Today;
            var rangeFrom = from ?? today.AddDays(-30);
            var rangeTo = to ?? today;
            return Ok(await _service.GetTransactionDepotOverviewAsync(rangeFrom, rangeTo, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
