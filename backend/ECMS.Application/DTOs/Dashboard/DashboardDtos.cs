namespace ECMS.Application.DTOs.Dashboard;

public record BrokerDashboardDto(
    int TotalRequests,
    int PendingRequests,
    int ApprovedRequests,
    int RejectedRequests,
    int CompletedReturns);

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
    int CompletedReturns);

public record AdminDashboardDto(
    int TotalUsers,
    int TotalPreAdvices,
    int PendingEvaluations,
    int ActiveSchedules);
