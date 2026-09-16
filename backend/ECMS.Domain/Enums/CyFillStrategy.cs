namespace ECMS.Domain.Enums;

/// <summary>How a shipping line steers empty-return CY fill order.</summary>
public enum CyFillStrategy
{
    /// <summary>Ordered depot priority list (fill higher-ranked CY first).</summary>
    PriorityList = 0,

    /// <summary>Shipping line picks the primary CY each calendar day.</summary>
    DailyAssignment = 1,
}
