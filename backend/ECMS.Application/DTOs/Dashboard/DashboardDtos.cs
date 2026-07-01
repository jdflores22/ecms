namespace ECMS.Application.DTOs.Dashboard;

public record DashboardRejectedReasonDto(
    string Reason,
    int Count);

public record DashboardWidgetsDto(
    int ExpiringWithin48Hours,
    int StuckOver24HoursInReview,
    double DepotTurnaroundHours,
    IReadOnlyList<DashboardRejectedReasonDto> TopRejectedReasons);

public record ShippingLineDashboardDto(
    int PendingEvaluations,
    int ApprovedToday,
    int RejectedToday,
    int AssignedCyCount,
    DashboardWidgetsDto Widgets);

public record DepotDashboardDto(
    int TodaysReturns,
    int AvailableSlots,
    int OccupiedSlots,
    int RemainingCapacity,
    DashboardWidgetsDto Widgets);

public record TruckerDashboardDto(
    int UpcomingReturns,
    int PendingPayments,
    int ConfirmedReturns,
    int CompletedReturns,
    int TotalRequests,
    int PendingRequests,
    int ApprovedRequests,
    int RejectedRequests,
    int CompletedPreAdviceReturns,
    int DraftWithdrawals,
    int IssuedWithdrawalsAwaitingUpload,
    int SubmittedWithdrawals,
    int ApprovedWithdrawals,
    DashboardWidgetsDto Widgets);

public record AdminDashboardDto(
    int TotalUsers,
    int TotalPreAdvices,
    int PendingEvaluations,
    int ActiveSchedules,
    DashboardWidgetsDto Widgets);
