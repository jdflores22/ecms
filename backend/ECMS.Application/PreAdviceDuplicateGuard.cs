using ECMS.Domain.Entities;
using ECMS.Domain.Enums;

namespace ECMS.Application;

public static class PreAdviceDuplicateGuard
{
    /// <summary>
    /// Only submitted (in-flight) requests block the same container. Drafts are allowed to overlap.
    /// </summary>
    public static readonly PreAdviceStatus[] BlockingStatuses =
    {
        PreAdviceStatus.Submitted,
        PreAdviceStatus.UnderEvaluation,
        PreAdviceStatus.Approved,
        PreAdviceStatus.ForCompliance,
    };

    public static string NormalizeContainerNo(string containerNo) =>
        containerNo.Trim().ToUpperInvariant();

    public static bool IsBlockingStatus(PreAdviceStatus status) =>
        BlockingStatuses.Contains(status);

    public static string BuildKey(string containerNo, int containerSizeId, int containerTypeId) =>
        $"{NormalizeContainerNo(containerNo)}|{containerSizeId}|{containerTypeId}";

    public static string? BuildActiveKey(PreAdvice preAdvice) =>
        IsBlockingStatus(preAdvice.Status)
        && !string.IsNullOrWhiteSpace(preAdvice.ContainerNoNormalized)
        && preAdvice.ContainerSizeId > 0
        && preAdvice.ContainerTypeId > 0
            ? BuildKey(
                preAdvice.ContainerNoNormalized,
                preAdvice.ContainerSizeId,
                preAdvice.ContainerTypeId)
            : null;

    public static void RefreshActiveKey(PreAdvice preAdvice) =>
        preAdvice.ActiveRequestKey = BuildActiveKey(preAdvice);
}
