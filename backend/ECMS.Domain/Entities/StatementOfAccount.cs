using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

/// <summary>
/// Collated statement of demurrage/detention charges for a trucker, released by the shipping line.
/// </summary>
public class StatementOfAccount : BaseEntity
{
    public string ReferenceNo { get; set; } = string.Empty;
    public int ShippingLineId { get; set; }
    public int TruckerId { get; set; }
    public DateOnly? PeriodFrom { get; set; }
    public DateOnly? PeriodTo { get; set; }
    public StatementOfAccountStatus Status { get; set; } = StatementOfAccountStatus.Draft;
    public decimal TotalAmount { get; set; }
    public decimal CreditApplied { get; set; }
    public decimal AmountDue { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public int? IssuedByUserId { get; set; }
    public string? Remarks { get; set; }
    public string? ProofFile { get; set; }
    public string? ProofReferenceNo { get; set; }
    public DateTime? ProofTransactionAt { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
    public User Trucker { get; set; } = null!;
    public User? IssuedByUser { get; set; }
    public ICollection<StatementOfAccountLine> Lines { get; set; } = new List<StatementOfAccountLine>();
}
