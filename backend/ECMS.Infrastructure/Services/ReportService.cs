using ECMS.Application.DTOs.Reports;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
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

        var schedules = await LoadSchedulesInRangeAsync(
            userId, role, from, to, depotId, cancellationToken: cancellationToken);

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
                    day.Count(s => s.Status == ScheduleStatus.NoShow));
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

        var schedules = await LoadSchedulesInRangeAsync(
            userId, role, from, to, depotId, cancellationToken: cancellationToken);

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
                    monthSchedules.Count(s => s.Status == ScheduleStatus.NoShow));
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
        int? shippingLineId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(from, to);
        var schedules = await LoadSchedulesInRangeAsync(
            userId, role, from, to, depotId, shippingLineId, cancellationToken);

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

    public async Task<IReadOnlyList<ReportShippingLineOptionDto>> GetShippingLineOptionsAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (role == RoleNames.Administrator)
        {
            return await _db.ShippingLines
                .Where(s => s.IsActive)
                .OrderBy(s => s.Name)
                .Select(s => new ReportShippingLineOptionDto(s.Id, s.Code, s.Name))
                .ToListAsync(cancellationToken);
        }

        var user = await _db.Users.FirstAsync(u => u.Id == userId, cancellationToken);

        if (role == RoleNames.DepotPersonnel && user.DepotId.HasValue)
        {
            var depotId = user.DepotId.Value;
            return await _db.ShippingLines
                .Where(s => s.IsActive
                    && _db.ShippingLineDepotContracts.Any(c =>
                        c.ShippingLineId == s.Id
                        && c.DepotId == depotId
                        && c.IsActive))
                .OrderBy(s => s.Name)
                .Select(s => new ReportShippingLineOptionDto(s.Id, s.Code, s.Name))
                .ToListAsync(cancellationToken);
        }

        if (role == RoleNames.ShippingLineEvaluator && user.ShippingLineId.HasValue)
        {
            return await _db.ShippingLines
                .Where(s => s.Id == user.ShippingLineId.Value && s.IsActive)
                .Select(s => new ReportShippingLineOptionDto(s.Id, s.Code, s.Name))
                .ToListAsync(cancellationToken);
        }

        return Array.Empty<ReportShippingLineOptionDto>();
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
        var schedules = await LoadSchedulesInRangeAsync(
            userId, role, from, to, depotId, cancellationToken: cancellationToken);

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

    public async Task<RevenueReportDto> GetRevenueAsync(
        string period,
        int? year = null,
        CancellationToken cancellationToken = default)
    {
        var normalized = (period ?? "monthly").Trim().ToLowerInvariant();
        if (normalized is not ("weekly" or "monthly" or "yearly"))
            throw new InvalidOperationException("Period must be weekly, monthly, or yearly.");

        var paid = await _db.Payments
            .Where(p => p.Status == PaymentStatus.Paid)
            .Select(p => new { p.Amount, At = p.PaidAt ?? p.CreatedAt })
            .ToListAsync(cancellationToken);

        var entries = paid
            .Select(p => (Date: PhilippinesTime.ToDateOnly(p.At), p.Amount))
            .ToList();

        return normalized switch
        {
            "weekly" => BuildWeeklyRevenue(entries),
            "monthly" => BuildMonthlyRevenue(entries, year ?? PhilippinesTime.Year),
            "yearly" => BuildYearlyRevenue(entries),
            _ => throw new InvalidOperationException("Period must be weekly, monthly, or yearly."),
        };
    }

    public async Task<TransactionReportDto> GetTransactionsAsync(
        DateOnly from,
        DateOnly to,
        int page = 1,
        int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(from, to);
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 500 ? 25 : pageSize;

        var inRange = await LoadPaymentsInTransactionRangeAsync(from, to, cancellationToken);
        var allRows = inRange.Select(MapTransactionRow).ToList();

        var pagedRows = allRows
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return BuildTransactionReport(from, to, pagedRows, allRows, page, pageSize);
    }

    public async Task<TransactionShippingLineOverviewDto> GetTransactionShippingLineOverviewAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(from, to);
        var inRange = await LoadPaymentsInTransactionRangeAsync(from, to, cancellationToken);

        var rows = inRange
            .GroupBy(x => x.Payment.Schedule.PreAdvice.ShippingLineId)
            .Select(g =>
            {
                var line = g.First().Payment.Schedule.PreAdvice.ShippingLine;
                var counts = CountByPaymentStatus(g);
                return new TransactionShippingLineOverviewRowDto(
                    g.Key,
                    line.Code,
                    line.Name,
                    g.Count(),
                    counts.Paid,
                    counts.Pending,
                    counts.Rejected,
                    g.Where(x => x.Payment.Status == PaymentStatus.Paid).Sum(x => x.Payment.Amount));
            })
            .OrderBy(r => r.Name)
            .ToList();

        return new TransactionShippingLineOverviewDto(
            from,
            to,
            rows,
            rows.Sum(r => r.TotalCount),
            rows.Sum(r => r.PaidCount),
            rows.Sum(r => r.PaidAmount),
            rows.Sum(r => r.PendingCount),
            rows.Sum(r => r.RejectedCount));
    }

    public async Task<TransactionDepotOverviewDto> GetTransactionDepotOverviewAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default)
    {
        ValidateDateRange(from, to);
        var inRange = await LoadPaymentsInTransactionRangeAsync(from, to, cancellationToken);

        var rows = inRange
            .GroupBy(x => x.Payment.Schedule.DepotId)
            .Select(g =>
            {
                var depot = g.First().Payment.Schedule.Depot;
                var counts = CountByPaymentStatus(g);
                return new TransactionDepotOverviewRowDto(
                    g.Key,
                    depot.Name,
                    g.Count(),
                    counts.Paid,
                    counts.Pending,
                    counts.Rejected,
                    g.Where(x => x.Payment.Status == PaymentStatus.Paid).Sum(x => x.Payment.Amount));
            })
            .OrderBy(r => r.Name)
            .ToList();

        return new TransactionDepotOverviewDto(
            from,
            to,
            rows,
            rows.Sum(r => r.TotalCount),
            rows.Sum(r => r.PaidCount),
            rows.Sum(r => r.PaidAmount),
            rows.Sum(r => r.PendingCount),
            rows.Sum(r => r.RejectedCount));
    }

    private sealed record PaymentInRange(
        Domain.Entities.Payment Payment,
        DateOnly TransactionDate,
        DateTime TransactionAt);

    private async Task<List<PaymentInRange>> LoadPaymentsInTransactionRangeAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var payments = await _db.Payments
            .Include(p => p.Trucker)
            .Include(p => p.Schedule).ThenInclude(s => s.PreAdvice).ThenInclude(pa => pa.ShippingLine)
            .Include(p => p.Schedule).ThenInclude(s => s.Depot)
            .OrderByDescending(p => p.PaidAt ?? p.CreatedAt)
            .ToListAsync(cancellationToken);

        return payments
            .Select(p =>
            {
                var at = p.PaidAt ?? p.CreatedAt;
                return new { Payment = p, Date = PhilippinesTime.ToDateOnly(at), At = at };
            })
            .Where(x => x.Date >= from && x.Date <= to)
            .Select(x => new PaymentInRange(x.Payment, x.Date, x.At))
            .ToList();
    }

    private static TransactionReportRowDto MapTransactionRow(PaymentInRange x)
    {
        var preAdvice = x.Payment.Schedule.PreAdvice;
        var shippingLine = preAdvice.ShippingLine;
        var depot = x.Payment.Schedule.Depot;

        return new TransactionReportRowDto(
            x.Payment.Id,
            x.Payment.ScheduleId,
            preAdvice.ContainerNoNormalized,
            preAdvice.ReferenceNo,
            x.Payment.Trucker.FullName ?? x.Payment.Trucker.Username,
            shippingLine.Id,
            shippingLine.Code,
            shippingLine.Name,
            depot.Id,
            depot.Name,
            x.Payment.Status.ToString(),
            x.Payment.Amount,
            x.TransactionDate,
            x.TransactionAt);
    }

    private static TransactionReportDto BuildTransactionReport(
        DateOnly from,
        DateOnly to,
        IReadOnlyList<TransactionReportRowDto> pagedRows,
        IReadOnlyList<TransactionReportRowDto> allRows,
        int page,
        int pageSize) =>
        new(
            from,
            to,
            pagedRows,
            allRows.Count,
            page,
            pageSize,
            allRows.Count(r => r.Status == nameof(PaymentStatus.Paid)),
            allRows.Where(r => r.Status == nameof(PaymentStatus.Paid)).Sum(r => r.Amount),
            allRows.Count(r => r.Status == nameof(PaymentStatus.ForVerification)),
            allRows.Count(r => r.Status == nameof(PaymentStatus.Rejected)));

    private static (int Paid, int Pending, int Rejected) CountByPaymentStatus(
        IEnumerable<PaymentInRange> payments)
    {
        var list = payments.ToList();
        return (
            list.Count(x => x.Payment.Status == PaymentStatus.Paid),
            list.Count(x => x.Payment.Status == PaymentStatus.ForVerification),
            list.Count(x => x.Payment.Status == PaymentStatus.Rejected));
    }

    private static RevenueReportDto BuildWeeklyRevenue(List<(DateOnly Date, decimal Amount)> entries)
    {
        var today = PhilippinesTime.Today;
        var currentWeekStart = StartOfWeek(today);
        var rows = new List<RevenueReportRowDto>();

        for (var i = 11; i >= 0; i--)
        {
            var start = currentWeekStart.AddDays(-7 * i);
            var end = start.AddDays(6);
            var inWeek = entries.Where(e => e.Date >= start && e.Date <= end).ToList();
            rows.Add(new RevenueReportRowDto(
                FormatWeekLabel(start, end),
                start,
                end,
                inWeek.Count,
                inWeek.Sum(e => e.Amount)));
        }

        return ToRevenueDto("weekly", rows);
    }

    private static RevenueReportDto BuildMonthlyRevenue(List<(DateOnly Date, decimal Amount)> entries, int year)
    {
        if (year < 2000 || year > 2100)
            throw new InvalidOperationException("Year must be between 2000 and 2100.");

        var rows = Enumerable.Range(1, 12)
            .Select(month =>
            {
                var start = new DateOnly(year, month, 1);
                var end = start.AddMonths(1).AddDays(-1);
                var inMonth = entries.Where(e => e.Date >= start && e.Date <= end).ToList();
                return new RevenueReportRowDto(
                    start.ToString("MMMM yyyy"),
                    start,
                    end,
                    inMonth.Count,
                    inMonth.Sum(e => e.Amount));
            })
            .ToList();

        return ToRevenueDto("monthly", rows);
    }

    private static RevenueReportDto BuildYearlyRevenue(List<(DateOnly Date, decimal Amount)> entries)
    {
        var currentYear = PhilippinesTime.Year;
        var firstYear = entries.Count > 0 ? entries.Min(e => e.Date.Year) : currentYear;
        var startYear = Math.Min(firstYear, currentYear - 4);

        var rows = Enumerable.Range(startYear, currentYear - startYear + 1)
            .Select(y =>
            {
                var start = new DateOnly(y, 1, 1);
                var end = new DateOnly(y, 12, 31);
                var inYear = entries.Where(e => e.Date.Year == y).ToList();
                return new RevenueReportRowDto(
                    y.ToString(),
                    start,
                    end,
                    inYear.Count,
                    inYear.Sum(e => e.Amount));
            })
            .ToList();

        return ToRevenueDto("yearly", rows);
    }

    private static RevenueReportDto ToRevenueDto(string period, IReadOnlyList<RevenueReportRowDto> rows)
    {
        var totalPayments = rows.Sum(r => r.PaymentCount);
        var totalRevenue = rows.Sum(r => r.TotalAmount);
        var average = totalPayments > 0 ? totalRevenue / totalPayments : 0m;

        return new RevenueReportDto(
            period,
            rows.Count > 0 ? rows[0].PeriodStart : PhilippinesTime.Today,
            rows.Count > 0 ? rows[^1].PeriodEnd : PhilippinesTime.Today,
            rows,
            totalPayments,
            totalRevenue,
            average);
    }

    private static DateOnly StartOfWeek(DateOnly date)
    {
        var offset = ((int)date.DayOfWeek + 6) % 7;
        return date.AddDays(-offset);
    }

    private static string FormatWeekLabel(DateOnly start, DateOnly end)
    {
        if (start.Year == end.Year)
        {
            if (start.Month == end.Month)
                return $"{start:MMM d} – {end:d, yyyy}";
            return $"{start:MMM d} – {end:MMM d, yyyy}";
        }

        return $"{start:MMM d, yyyy} – {end:MMM d, yyyy}";
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
        int? shippingLineId = null,
        CancellationToken cancellationToken = default)
    {
        var filtered = await ApplyRoleFilterAsync(_db.Schedules.AsQueryable(), userId, role, depotId);
        if (shippingLineId.HasValue)
            filtered = filtered.Where(s => s.PreAdvice.ShippingLineId == shippingLineId.Value);

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
            schedules.Count(s => s.Status == ScheduleStatus.NoShow)
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
