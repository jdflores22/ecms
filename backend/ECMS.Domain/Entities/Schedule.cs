using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class Schedule : BaseEntity
{
    public int PreAdviceId { get; set; }
    public int DepotId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int SlotNo { get; set; }
    public ScheduleStatus Status { get; set; } = ScheduleStatus.WaitingSchedule;
    public int? TruckerId { get; set; }
    public string? DepotRemarks { get; set; }

    public PreAdvice PreAdvice { get; set; } = null!;
    public Depot Depot { get; set; } = null!;
    public User? Trucker { get; set; }
    public Payment? Payment { get; set; }
    public QRBooking? QRBooking { get; set; }
}
