using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ShippingLine : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<Container> Containers { get; set; } = new List<Container>();
    public ICollection<PreAdvice> PreAdvices { get; set; } = new List<PreAdvice>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
