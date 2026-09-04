using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class StatementOfAccountLine : BaseEntity
{
    public int StatementOfAccountId { get; set; }
    public int DemurrageBillingId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }

    public StatementOfAccount StatementOfAccount { get; set; } = null!;
    public DemurrageBilling DemurrageBilling { get; set; } = null!;
}
