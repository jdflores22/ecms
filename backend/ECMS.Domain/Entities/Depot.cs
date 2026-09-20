using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class Depot : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int Capacity { get; set; }
    /// <summary>Max empty returns accepted per hourly time slot within operating hours.</summary>
    public int ContainersPerHour { get; set; } = 3;
    /// <summary>First bookable hour (0–23). Use 0 with <see cref="OperatingHourEnd"/> 23 for 24-hour yards.</summary>
    public int OperatingHourStart { get; set; } = 8;
    /// <summary>Last bookable hour (0–23), inclusive.</summary>
    public int OperatingHourEnd { get; set; } = 17;
    public bool IsActive { get; set; } = true;

    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
