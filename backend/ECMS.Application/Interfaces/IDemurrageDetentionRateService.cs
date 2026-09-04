using ECMS.Application.DTOs.DemurrageDetentionRate;

namespace ECMS.Application.Interfaces;

public interface IDemurrageDetentionRateService
{
    Task<IReadOnlyList<DemurrageDetentionRateDto>> GetAllAsync(
        int userId,
        string role,
        int? shippingLineId,
        CancellationToken cancellationToken = default);

    Task<DemurrageDetentionRateDto?> GetByIdAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DemurrageDetentionRateDto> CreateAsync(
        UpsertDemurrageDetentionRateRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<DemurrageDetentionRateDto?> UpdateAsync(
        int id,
        UpsertDemurrageDetentionRateRequest request,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateAsync(
        int id,
        int userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ResolvedDemurrageDetentionRateDto> ResolveAsync(
        int shippingLineId,
        int? depotId,
        int? containerSizeId,
        DateOnly? asOf,
        CancellationToken cancellationToken = default);
}
