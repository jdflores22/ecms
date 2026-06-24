using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class Payment : BaseEntity
{
    public int ScheduleId { get; set; }
    public int TruckerId { get; set; }
    public decimal Amount { get; set; }
    public string? ProofFile { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime? PaidAt { get; set; }

    public Schedule Schedule { get; set; } = null!;
    public User Trucker { get; set; } = null!;
}
