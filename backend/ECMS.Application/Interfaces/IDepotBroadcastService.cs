using ECMS.Application.DTOs.Depot;

namespace ECMS.Application.Interfaces;

public interface IDepotBroadcastService
{
    Task<DepotBroadcastDto> SendAsync(
        int actorUserId,
        string role,
        CreateDepotBroadcastRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DepotBroadcastDto>> GetHistoryAsync(
        int actorUserId,
        string role,
        CancellationToken cancellationToken = default);
}
