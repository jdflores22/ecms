using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class Container : BaseEntity
{
    public string ContainerNo { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int ShippingLineId { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
    public ICollection<PreAdvice> PreAdvices { get; set; } = new List<PreAdvice>();
}
