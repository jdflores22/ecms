using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class Depot : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int Capacity { get; set; }
    /// <summary>Max empty returns accepted per hourly time slot (0800–1700).</summary>
    public int ContainersPerHour { get; set; } = 3;
    public bool IsActive { get; set; } = true;

    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
