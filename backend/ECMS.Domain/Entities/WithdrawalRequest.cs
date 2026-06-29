using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class WithdrawalRequest : BaseEntity
{
    public string ReferenceNo { get; set; } = string.Empty;
    public string AtwNumber { get; set; } = string.Empty;
    public int TruckerId { get; set; }
    public int ShippingLineId { get; set; }
    public int CurrentDepotId { get; set; }
    public string Destination { get; set; } = string.Empty;
    public DateOnly IssueDate { get; set; }
    public DateOnly ExpirationDate { get; set; }
    public WithdrawalPurpose Purpose { get; set; } = WithdrawalPurpose.Repositioning;
    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Draft;
    public string? Remarks { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? ReviewRemarks { get; set; }

    public User Trucker { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot CurrentDepot { get; set; } = null!;
    public ICollection<WithdrawalRequestLine> Lines { get; set; } = new List<WithdrawalRequestLine>();
    public ICollection<WithdrawalDocument> Documents { get; set; } = new List<WithdrawalDocument>();
}
