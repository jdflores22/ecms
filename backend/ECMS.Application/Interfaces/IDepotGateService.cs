using ECMS.Application.DTOs.DepotGate;

namespace ECMS.Application.Interfaces;

public interface IDepotGateService
{
    Task<DepotGateScanResponse> ScanAsync(string rawQrCode, int userId, string role, CancellationToken cancellationToken = default);
    Task<DepotGateCheckInResponse> CheckInAsync(string rawQrCode, int userId, string role, CancellationToken cancellationToken = default);
}
