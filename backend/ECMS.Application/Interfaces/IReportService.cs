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
        CancellationToken cancellationToken = default);

    Task<DepotReportDto> GetDepotReportAsync(
        int userId,
        string role,
        DateOnly from,
        DateOnly to,
        int? depotId = null,
        CancellationToken cancellationToken = default);
}
