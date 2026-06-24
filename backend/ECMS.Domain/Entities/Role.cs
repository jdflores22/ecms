using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CapabilitiesJson { get; set; } = "[]";
    public string AllowedPagesJson { get; set; } = "[]";
    public ICollection<User> Users { get; set; } = new List<User>();
}
