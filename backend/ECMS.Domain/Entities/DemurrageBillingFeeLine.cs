using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class DemurrageBillingFeeLine : BaseEntity
{
    public int DemurrageBillingId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }

    public DemurrageBilling DemurrageBilling { get; set; } = null!;
}
