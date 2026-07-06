using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class WithdrawalSchedule : BaseEntity
{
    public int WithdrawalRequestId { get; set; }
    public int DepotId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int SlotNo { get; set; }
    public ScheduleStatus Status { get; set; } = ScheduleStatus.Scheduled;
    public int? TruckerId { get; set; }
    public string? DepotRemarks { get; set; }

    public WithdrawalRequest WithdrawalRequest { get; set; } = null!;
    public Depot Depot { get; set; } = null!;
    public User? Trucker { get; set; }
}
