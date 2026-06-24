namespace ECMS.Application.DTOs.Reports;

public record DailyReturnReportRowDto(
    DateOnly Date,
    int Scheduled,
    int Confirmed,
    int Completed,
    int Cancelled);

public record DailyReturnReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<DailyReturnReportRowDto> Rows,
    int TotalScheduled,
    int TotalCompleted);

public record MonthlyReturnReportRowDto(
    int Year,
    int Month,
    string Label,
    int Scheduled,
    int Confirmed,
    int Completed,
    int Cancelled);

public record MonthlyReturnReportDto(
    int Year,
    IReadOnlyList<MonthlyReturnReportRowDto> Rows,
    int TotalScheduled,
    int TotalCompleted);

public record ShippingLineReportRowDto(
    int ShippingLineId,
    string Code,
    string Name,
    int Scheduled,
    int Confirmed,
    int Completed,
    int Cancelled);

public record ShippingLineReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<ShippingLineReportRowDto> Rows,
    int TotalScheduled,
    int TotalCompleted);

public record DepotReportRowDto(
    int DepotId,
    string Name,
    int Scheduled,
    int Confirmed,
    int Completed,
    int Cancelled);

public record DepotReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<DepotReportRowDto> Rows,
    int TotalScheduled,
    int TotalCompleted);
