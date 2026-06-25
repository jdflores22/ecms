namespace ECMS.Application.DTOs.Dashboard;

public record ShippingLineDashboardDto(
    int PendingEvaluations,
    int ApprovedToday,
    int RejectedToday,
    int AssignedCyCount);

public record DepotDashboardDto(
    int TodaysReturns,
    int AvailableSlots,
    int OccupiedSlots,
    int RemainingCapacity);

public record TruckerDashboardDto(
    int UpcomingReturns,
    int PendingPayments,
    int ConfirmedReturns,
    int CompletedReturns,
    int TotalRequests,
    int PendingRequests,
    int ApprovedRequests,
    int RejectedRequests,
    int CompletedPreAdviceReturns);

public record AdminDashboardDto(
    int TotalUsers,
    int TotalPreAdvices,
    int PendingEvaluations,
    int ActiveSchedules);
