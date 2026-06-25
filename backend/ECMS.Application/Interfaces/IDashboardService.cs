using ECMS.Application.DTOs.Dashboard;

namespace ECMS.Application.Interfaces;

public interface IDashboardService
{
    Task<ShippingLineDashboardDto> GetShippingLineDashboardAsync(int evaluatorId, CancellationToken cancellationToken = default);
    Task<DepotDashboardDto> GetDepotDashboardAsync(int depotId, CancellationToken cancellationToken = default);
    Task<TruckerDashboardDto> GetTruckerDashboardAsync(int truckerId, CancellationToken cancellationToken = default);
    Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken cancellationToken = default);
}
