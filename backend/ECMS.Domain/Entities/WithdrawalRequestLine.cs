using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class WithdrawalRequestLine : BaseEntity
{
    public int WithdrawalRequestId { get; set; }
    public int LineNo { get; set; }
    public int ContainerId { get; set; }
    public string ContainerNoNormalized { get; set; } = string.Empty;
    public int ContainerSizeId { get; set; }
    public int ContainerTypeId { get; set; }
    /// <summary>Blocks duplicate in-flight requests: depot|container|size|type.</summary>
    public string? ActiveRequestKey { get; set; }
    public WithdrawalLineStatus LineStatus { get; set; } = WithdrawalLineStatus.Pending;
    public DateTime? ReleasedAt { get; set; }

    public WithdrawalRequest WithdrawalRequest { get; set; } = null!;
    public Container Container { get; set; } = null!;
    public ContainerSize ContainerSize { get; set; } = null!;
    public ContainerType ContainerType { get; set; } = null!;
}
