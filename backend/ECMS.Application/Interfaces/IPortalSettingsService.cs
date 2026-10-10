using ECMS.Application.DTOs.Portal;

namespace ECMS.Application.Interfaces;

public interface IPortalSettingsService
{
    Task<PortalSettingsDto> GetAsync(CancellationToken cancellationToken = default);
    Task<bool> IsIcsCroEdoQrEnabledAsync(CancellationToken cancellationToken = default);
    Task<bool> IsSoaEnabledAsync(CancellationToken cancellationToken = default);
    Task<bool> IsWithdrawalsEnabledAsync(CancellationToken cancellationToken = default);
    Task<PortalSettingsDto> UpdateAsync(
        UpdatePortalSettingsRequest request,
        int adminUserId,
        CancellationToken cancellationToken = default);
}
