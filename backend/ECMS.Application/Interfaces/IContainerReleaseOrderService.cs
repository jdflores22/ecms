using ECMS.Application.DTOs.ContainerReleaseOrder;

namespace ECMS.Application.Interfaces;

public interface IContainerReleaseOrderService
{
    Task<IReadOnlyList<ContainerReleaseOrderDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<ContainerReleaseOrderDto?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<ContainerReleaseOrderDto> CreateAsync(CreateContainerReleaseOrderRequest request, int userId, string role, CancellationToken cancellationToken = default);
    Task<ContainerReleaseOrderDto> UpdateAsync(int id, UpdateContainerReleaseOrderRequest request, int userId, string role, CancellationToken cancellationToken = default);
    Task<ContainerReleaseOrderDto> IssueAsync(int id, int userId, string role, string? uploadRoot, string? logoPath, CancellationToken cancellationToken = default);
    Task<ContainerReleaseOrderDto> RegeneratePdfAsync(int id, int userId, string role, string? uploadRoot, string? logoPath, CancellationToken cancellationToken = default);
    Task<ContainerReleaseOrderDto> CancelAsync(int id, int userId, string role, CancellationToken cancellationToken = default);
    Task<(byte[] Bytes, string FileName)?> GetPdfAsync(int id, int userId, string role, string? uploadRoot, CancellationToken cancellationToken = default);
    Task<CroEdoVerificationResponseDto> VerifyPublicAsync(string plainToken, CancellationToken cancellationToken = default);
    /// <summary>Resolve an issued CRO by verify token without counting a public scan.</summary>
    Task<CroEdoLinkDto?> ResolveIssuedLinkAsync(string plainToken, CancellationToken cancellationToken = default);
}
