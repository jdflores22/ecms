using ECMS.Domain.Entities;
using ECMS.Domain.Enums;

namespace ECMS.Application;

public static class WithdrawalDuplicateGuard
{
    public static readonly WithdrawalStatus[] BlockingStatuses =
    {
        WithdrawalStatus.Submitted,
        WithdrawalStatus.UnderReview,
        WithdrawalStatus.Approved,
        WithdrawalStatus.Released,
    };

    public static string NormalizeContainerNo(string containerNo) =>
        containerNo.Trim().ToUpperInvariant();

    public static string NormalizeAtwNumber(string atwNumber) =>
        atwNumber.Trim().ToUpperInvariant();

    public static bool IsBlockingStatus(WithdrawalStatus status) =>
        BlockingStatuses.Contains(status);

    public static string BuildKey(int depotId, string containerNo, int containerSizeId, int containerTypeId) =>
        $"{depotId}|{NormalizeContainerNo(containerNo)}|{containerSizeId}|{containerTypeId}";

    public static string BuildLineIdentityKey(string containerNo, int containerSizeId, int containerTypeId) =>
        $"{NormalizeContainerNo(containerNo)}|{containerSizeId}|{containerTypeId}";

    public static string? BuildActiveKey(WithdrawalRequest request, WithdrawalRequestLine line) =>
        IsBlockingStatus(request.Status)
        && request.CurrentDepotId > 0
        && !string.IsNullOrWhiteSpace(line.ContainerNoNormalized)
        && line.ContainerSizeId > 0
        && line.ContainerTypeId > 0
            ? BuildKey(
                request.CurrentDepotId,
                line.ContainerNoNormalized,
                line.ContainerSizeId,
                line.ContainerTypeId)
            : null;

    public static void RefreshActiveKey(WithdrawalRequest request, WithdrawalRequestLine line) =>
        line.ActiveRequestKey = BuildActiveKey(request, line);

    public static void RefreshActiveKeys(WithdrawalRequest request)
    {
        foreach (var line in request.Lines)
            RefreshActiveKey(request, line);
    }

    public static void ClearActiveKeys(WithdrawalRequest request)
    {
        foreach (var line in request.Lines)
            line.ActiveRequestKey = null;
    }
}
