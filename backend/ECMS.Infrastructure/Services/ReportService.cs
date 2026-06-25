using ECMS.Application.DTOs.Reports;
using ECMS.Application.Interfaces;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly IEcmsDbContext _db;

    public ReportService(IEcmsDbContext db)
    {
        _db = db;
    }

    public async Task<DailyReturnReportDto> GetDailyReturnsAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        CancellationToken cancellationToken = default)
    {
        if (to < from)
            throw new InvalidOperationException("'to' date must be on or after 'from' date.");

        var spanDays = to.DayNumber - from.DayNumber;
        if (spanDays > 366)
            throw new InvalidOperationException("Date range cannot exceed 366 days.");

        var schedules = await LoadSchedulesInRangeAsync(userId, role, from, to, depotId, cancellationToken);

        var rows = Enumerable.Range(0, spanDays + 1)
            .Select(offset => from.AddDays(offset))
            .Select(date =>
            {
                var day = schedules.Where(s => s.Date == date).ToList();
                return new DailyReturnReportRowDto(
                    date,
                    day.Count(s => s.Status == ScheduleStatus.Scheduled),
                    day.Count(s => s.Status == ScheduleStatus.Confirmed),
                    day.Count(s => s.Status == ScheduleStatus.Completed),
                    day.Count(s => s.Status == ScheduleStatus.Cancelled));
            })
            .ToList();

        return new DailyReturnReportDto(
            from,
            to,
            rows,
            rows.Sum(r => r.Scheduled + r.Confirmed + r.Completed + r.Cancelled),
            rows.Sum(r => r.Completed));
    }

    public async Task<MonthlyReturnReportDto> GetMonthlyReturnsAsync(
        int userId,
        string role,
        int year,
        int? depotId = null,
        CancellationToken cancellationToken = default)
    {
        if (year < 2000 || year > 2100)
            throw new InvalidOperationException("Year must be between 2000 and 2100.");

        var from = new DateOnly(year, 1, 1);
        var to = new DateOnly(year, 12, 31);

        var schedules = await LoadSchedulesInRangeAsync(userId, role, from, to, depotId, cancellationToken);

        var rows = Enumerable.Range(1, 12)
            .Select(month =>
            {
                var monthSchedules = schedules.Where(s => s.Date.Year == year && s.Date.Month == month).ToList();
                return new MonthlyReturnReportRowDto(
                    year,
                    month,
                    new DateOnly(year, month, 1).ToString("MMMM yyyy"),
                    monthSchedules.Count(s => s.Status == ScheduleStatus.Scheduled),
                    monthSchedules.Count(s => s.Status == ScheduleStatus.Confirmed),
                    monthSchedules.Count(s => s.Status == ScheduleStatus.Completed),
                    monthSchedules.Count(s => s.Status == ScheduleStatus.Cancelled));
            })
            .ToList();

        return new MonthlyReturnReportDto(
            year,
            rows,
            rows.Sum(r => r.Scheduled + r.Confirmed + r.Completed + r.Cancelled),
            rows.Sum(r => r.Completed));
    }

    public async Task<ShippingLineReportDto> GetShippingLineReportAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(from, to);
        var schedules = await LoadSchedulesInRangeAsync(userId, role, from, to, depotId, cancellationToken);

        var rows = schedules
            .GroupBy(s => s.PreAdvice.ShippingLineId)
            .Select(g =>
            {
                var line = g.First().PreAdvice.ShippingLine;
                var counts = CountByStatus(g);
                return new ShippingLineReportRowDto(
                    g.Key,
                    line.Code,
                    line.Name,
                    counts.Scheduled,
                    counts.Confirmed,
                    counts.Completed,
                    counts.Cancelled);
            })
            .OrderBy(r => r.Name)
            .ToList();

        return new ShippingLineReportDto(
            from,
            to,
            rows,
            rows.Sum(r => r.Scheduled + r.Confirmed + r.Completed + r.Cancelled),
            rows.Sum(r => r.Completed));
    }

    public async Task<DepotReportDto> GetDepotReportAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(from, to);
        var schedules = await LoadSchedulesInRangeAsync(userId, role, from, to, depotId, cancellationToken);

        var rows = schedules
            .GroupBy(s => s.DepotId)
            .Select(g =>
            {
                var depot = g.First().Depot;
                var counts = CountByStatus(g);
                return new DepotReportRowDto(
                    g.Key,
                    depot.Name,
                    counts.Scheduled,
                    counts.Confirmed,
                    counts.Completed,
                    counts.Cancelled);
            })
            .OrderBy(r => r.Name)
            .ToList();

        return new DepotReportDto(
            from,
            to,
            rows,
            rows.Sum(r => r.Scheduled + r.Confirmed + r.Completed + r.Cancelled),
            rows.Sum(r => r.Completed));
    }

    private static void ValidateDateRange(DateOnly from, DateOnly to)
    {
        if (to < from)
            throw new InvalidOperationException("'to' date must be on or after 'from' date.");

        if (to.DayNumber - from.DayNumber > 366)
            throw new InvalidOperationException("Date range cannot exceed 366 days.");
    }

    private async Task<List<Domain.Entities.Schedule>> LoadSchedulesInRangeAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId,
        CancellationToken cancellationToken)
    {
        var filtered = await ApplyRoleFilterAsync(_db.Schedules.AsQueryable(), userId, role, depotId);
        return await filtered
            .Where(s => s.Date >= from && s.Date <= to)
            .Include(s => s.PreAdvice).ThenInclude(p => p.ShippingLine)
            .Include(s => s.Depot)
            .ToListAsync(cancellationToken);
    }

    private static (int Scheduled, int Confirmed, int Completed, int Cancelled) CountByStatus(
        IEnumerable<Domain.Entities.Schedule> schedules) =>
        (
            schedules.Count(s => s.Status == ScheduleStatus.Scheduled),
            schedules.Count(s => s.Status == ScheduleStatus.Confirmed),
            schedules.Count(s => s.Status == ScheduleStatus.Completed),
            schedules.Count(s => s.Status == ScheduleStatus.Cancelled)
        );

    private async Task<IQueryable<Domain.Entities.Schedule>> ApplyRoleFilterAsync(
        IQueryable<Domain.Entities.Schedule> query,
        int userId,
        string role,
        int? depotId)
    {
        if (depotId.HasValue)
            query = query.Where(s => s.DepotId == depotId);

        if (role == RoleNames.Administrator)
            return query;

        var user = await _db.Users.FirstAsync(u => u.Id == userId);

        return role switch
        {
            RoleNames.DepotPersonnel when user.DepotId.HasValue =>
                query.Where(s => s.DepotId == user.DepotId),
            RoleNames.Trucker =>
                query.Where(s => s.PreAdvice.TruckerId == userId || s.TruckerId == userId),
            RoleNames.ShippingLineEvaluator when user.ShippingLineId.HasValue =>
                query.Where(s => s.PreAdvice.ShippingLineId == user.ShippingLineId),
            _ => query
        };
    }
}
