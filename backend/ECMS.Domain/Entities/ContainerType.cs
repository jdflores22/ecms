using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ContainerType : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
