using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class Evaluation : BaseEntity
{
    public int PreAdviceId { get; set; }
    public int EvaluatorId { get; set; }
    public int? DepotId { get; set; }
    public string? Remarks { get; set; }
    public PreAdviceStatus Status { get; set; }
    public DateTime EvaluatedAt { get; set; } = PhilippinesTime.UtcNow;

    public PreAdvice PreAdvice { get; set; } = null!;
    public User Evaluator { get; set; } = null!;
    public Depot? Depot { get; set; }
}
