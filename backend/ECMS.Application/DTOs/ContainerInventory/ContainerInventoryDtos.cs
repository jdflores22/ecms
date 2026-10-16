using ECMS.Application.DTOs.PreAdvice;

namespace ECMS.Application.DTOs.ContainerInventory;

public record ContainerInventoryResponseDto(
    ContainerInventorySummaryDto Summary,
    IReadOnlyList<ContainerInventoryItemDto> Items);

public record DepotContainerInventoryResponseDto(
    DepotContainerInventorySummaryDto Summary,
    IReadOnlyList<ContainerInventoryItemDto> Items);

public record DepotContainerInventorySummaryDto(
    int DepotId,
    string DepotName,
    int TotalAtYard,
    int ReleasedCount,
    int WithinLimitCount,
    int ApproachingLimitCount,
    int OverstayCount,
    int DwellLimitDays,
    int WarningThresholdDays,
    int Size20Count,
    int Size40Count,
    decimal UsedTeu,
    decimal ContractTeu,
    IReadOnlyList<ContainerInventoryShippingLineSummaryDto> ByShippingLine);

public record ContainerInventoryShippingLineSummaryDto(
    int ShippingLineId,
    string ShippingLineCode,
    string ShippingLineName,
    int AtYardCount,
    int ReleasedCount,
    int OverstayCount);

public record ContainerInventorySummaryDto(
    int ShippingLineId,
    string ShippingLineCode,
    string ShippingLineName,
    int TotalAtYard,
    int ReleasedCount,
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
    int AtYardCount,
    int ReleasedCount,
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
    int ShippingLineId,
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
    string YardStatus,
    string? ReleasedAt,
    string? ReleaseReferenceNo,
    int? ReleaseWithdrawalId,
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

/// <summary>ICS = ICS workflow/manual footprint; LOGICTECK = yard feed identity.</summary>
public record LogicteckContainerPhotoDto(
    string Url,
    string? Label,
    string? Category);

public record ContainerInventoryDetailDto(
    ContainerInventoryItemDto Item,
    string FootprintSource,
    /// <summary>ICS = pre-forecast uploads; LOGICTECK = yard feed photo API.</summary>
    string PhotoFootprintSource,
    IReadOnlyList<PreAdviceDocumentDto> IcsPhotos,
    IReadOnlyList<LogicteckContainerPhotoDto> LogicteckPhotos,
    IReadOnlyList<ContainerInventoryDetailFieldDto> ExtraFields);

public record ContainerInventoryDetailFieldDto(string Label, string Value);

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
