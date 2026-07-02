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

public record ReportShippingLineOptionDto(
    int Id,
    string Code,
    string Name);

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

public record RevenueReportRowDto(
    string Label,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    int PaymentCount,
    decimal TotalAmount);

public record RevenueReportDto(
    string Period,
    DateOnly From,
    DateOnly To,
    IReadOnlyList<RevenueReportRowDto> Rows,
    int TotalPayments,
    decimal TotalRevenue,
    decimal AveragePayment);

public record TransactionReportRowDto(
    int PaymentId,
    int ScheduleId,
    string ContainerNo,
    string ReferenceNo,
    string TruckerName,
    int ShippingLineId,
    string ShippingLineCode,
    string ShippingLineName,
    int DepotId,
    string DepotName,
    string Status,
    decimal Amount,
    DateOnly TransactionDate,
    DateTime? TransactionAt);

public record TransactionShippingLineOverviewRowDto(
    int ShippingLineId,
    string Code,
    string Name,
    int TotalCount,
    int PaidCount,
    int PendingCount,
    int RejectedCount,
    decimal PaidAmount);

public record TransactionDepotOverviewRowDto(
    int DepotId,
    string Name,
    int TotalCount,
    int PaidCount,
    int PendingCount,
    int RejectedCount,
    decimal PaidAmount);

public record TransactionShippingLineOverviewDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<TransactionShippingLineOverviewRowDto> Rows,
    int TotalCount,
    int PaidCount,
    decimal PaidAmount,
    int PendingCount,
    int RejectedCount);

public record TransactionDepotOverviewDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<TransactionDepotOverviewRowDto> Rows,
    int TotalCount,
    int PaidCount,
    decimal PaidAmount,
    int PendingCount,
    int RejectedCount);

public record TransactionReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<TransactionReportRowDto> Rows,
    int Total,
    int Page,
    int PageSize,
    int PaidCount,
    decimal PaidAmount,
    int PendingCount,
    int RejectedCount);
