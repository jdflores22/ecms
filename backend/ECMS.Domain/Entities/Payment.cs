using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class Payment : BaseEntity
{
    public int ScheduleId { get; set; }
    public int TruckerId { get; set; }
    public decimal Amount { get; set; }
    public string? ProofFile { get; set; }
    /// <summary>Reference number read from the payment proof (e.g. GCash Ref No.).</summary>
    public string? ProofReferenceNo { get; set; }
    /// <summary>Transaction date/time read from the payment proof, stored as UTC.</summary>
    public DateTime? ProofTransactionAt { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime? PaidAt { get; set; }

    public Schedule Schedule { get; set; } = null!;
    public User Trucker { get; set; } = null!;
}
