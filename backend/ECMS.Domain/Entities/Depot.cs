using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class Depot : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
