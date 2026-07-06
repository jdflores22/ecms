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
    public string? BookingNumber { get; set; }
    public string? TruckingCompany { get; set; }
    public string? PlateNumber { get; set; }
    public string? DriverName { get; set; }
    public int? RequestedDepotId { get; set; }
    public int? AssignedDepotId { get; set; }
    public DateTime? BookedAt { get; set; }
    public DateTime? CyAssignedAt { get; set; }
    public int? CyAssignedByUserId { get; set; }

    public User Trucker { get; set; } = null!;
    public ShippingLine ShippingLine { get; set; } = null!;
    public Depot CurrentDepot { get; set; } = null!;
    public Depot? RequestedDepot { get; set; }
    public Depot? AssignedDepot { get; set; }
    public User? CyAssignedBy { get; set; }
    public WithdrawalSchedule? PickupSchedule { get; set; }
    public ICollection<WithdrawalRequestLine> Lines { get; set; } = new List<WithdrawalRequestLine>();
    public ICollection<WithdrawalDocument> Documents { get; set; } = new List<WithdrawalDocument>();
}
