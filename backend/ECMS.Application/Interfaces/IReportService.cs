using ECMS.Application.DTOs.Reports;

namespace ECMS.Application.Interfaces;

public interface IReportService
{
    Task<DailyReturnReportDto> GetDailyReturnsAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        CancellationToken cancellationToken = default);

    Task<MonthlyReturnReportDto> GetMonthlyReturnsAsync(
        int userId,
        string role,
        int year,
        int? depotId = null,
        CancellationToken cancellationToken = default);

    Task<ShippingLineReportDto> GetShippingLineReportAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        int? shippingLineId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ReportShippingLineOptionDto>> GetShippingLineOptionsAsync(
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DepotReportDto> GetDepotReportAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        CancellationToken cancellationToken = default);

    Task<RevenueReportDto> GetRevenueAsync(
        string period,
        int? year = null,
        CancellationToken cancellationToken = default);

    Task<TransactionReportDto> GetTransactionsAsync(
        DateOnly from,
        DateOnly to,
        int page = 1,
        int pageSize = 25,
        CancellationToken cancellationToken = default);

    Task<TransactionShippingLineOverviewDto> GetTransactionShippingLineOverviewAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default);

    Task<TransactionDepotOverviewDto> GetTransactionDepotOverviewAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default);
}
