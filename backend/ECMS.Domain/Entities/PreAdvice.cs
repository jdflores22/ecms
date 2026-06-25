using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class PreAdvice : BaseEntity
{
    public string ReferenceNo { get; set; } = string.Empty;
    public int TruckerId { get; set; }
    public int ShippingLineId { get; set; }
    public int ContainerId { get; set; }
    public PreAdviceStatus Status { get; set; } = PreAdviceStatus.Draft;
    public string? Remarks { get; set; }

    public User Trucker { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public Container Container { get; set; } = null!;
    public Evaluation? Evaluation { get; set; }
    public Schedule? Schedule { get; set; }
    public ICollection<PreAdviceDocument> Documents { get; set; } = new List<PreAdviceDocument>();
}
