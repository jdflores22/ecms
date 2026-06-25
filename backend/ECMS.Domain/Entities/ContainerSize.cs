using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ContainerSize : BaseEntity
{
    public string Label { get; set; } = string.Empty;
    public decimal Teu { get; set; } = 2m;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
