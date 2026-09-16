namespace ECMS.Application.DTOs.ShippingLineCyFill;

public record ShippingLineCyFillSettingsDto(
    int ShippingLineId,
    string ShippingLineName,
    string CyFillStrategy,
    IReadOnlyList<ShippingLineDepotFillPriorityDto> Priorities,
    ShippingLineDailyDepotFillDto? TodayAssignment);

public record ShippingLineDepotFillPriorityDto(int DepotId, string DepotName, int SortOrder);

public record ShippingLineDailyDepotFillDto(
    DateOnly EffectiveDate,
    int PrimaryDepotId,
    string PrimaryDepotName,
    DateTime SetAt,
    string SetByName);

public record UpdateCyFillStrategyRequest(string CyFillStrategy);

public record UpdateCyFillPrioritiesRequest(IReadOnlyList<int> DepotIdsInOrder);

public record SetDailyDepotFillRequest(DateOnly EffectiveDate, int PrimaryDepotId);

public record RecommendedDepotOrderDto(
    int ShippingLineId,
    DateOnly EffectiveDate,
    string CyFillStrategy,
    IReadOnlyList<int> DepotIdsInOrder);
