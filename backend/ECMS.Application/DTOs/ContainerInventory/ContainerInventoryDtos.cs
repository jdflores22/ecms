namespace ECMS.Application.DTOs.ContainerInventory;

public record ContainerInventoryResponseDto(
    ContainerInventorySummaryDto Summary,
    IReadOnlyList<ContainerInventoryItemDto> Items);

public record ContainerInventorySummaryDto(
    int TotalAtYard,
    int WithinLimitCount,
    int ApproachingLimitCount,
    int OverstayCount,
    int DwellLimitDays,
    int WarningThresholdDays,
    int Size20Count,
    int Size40Count,
    decimal UsedTeu,
    decimal ContractTeu,
    IReadOnlyList<ContainerInventoryDepotSummaryDto> ByDepot);

public record ContainerInventoryDepotSummaryDto(
    int DepotId,
    string DepotName,
    int Count,
    int OverstayCount);

public record ContainerInventoryItemDto(
    int? ScheduleId,
    int? ManualEntryId,
    int? PreAdviceId,
    string ReferenceNo,
    string Source,
    string ContainerNo,
    string ContainerSize,
    string ContainerType,
    string ShippingLineCode,
    string ShippingLineName,
    string? TruckerName,
    int DepotId,
    string DepotName,
    DateOnly YardInDate,
    string? GateInTime,
    int DwellDays,
    int DaysRemaining,
    string ComplianceStatus,
    string? ScheduleStatus,
    string? Remarks);

public record CreateManualYardInventoryRequest(
    string ContainerNo,
    int ContainerSizeId,
    int ContainerTypeId,
    int DepotId,
    DateOnly YardInDate,
    string? Remarks,
    int? ShippingLineId);

public record BulkCreateManualYardInventoryRequest(
    IReadOnlyList<CreateManualYardInventoryRequest> Entries);

public record ManualYardInventoryBulkError(
    int Line,
    string ContainerNo,
    string Message);

public record BulkCreateManualYardInventoryResponse(
    int SuccessCount,
    IReadOnlyList<ManualYardInventoryBulkError> Errors);

public record ManualYardInventoryEntryDto(
    int Id,
    string ContainerNo,
    string ContainerSize,
    string ContainerType,
    int DepotId,
    string DepotName,
    DateOnly YardInDate,
    string? Remarks,
    string CreatedAt);
