using ECMS.Application.DTOs.PreAdvice;
using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.Withdrawal;

public record WithdrawalLineDto(
    int Id,
    int LineNo,
    int ContainerId,
    string ContainerNo,
    int ContainerSizeId,
    string ContainerSize,
    int ContainerTypeId,
    string ContainerType,
    WithdrawalLineStatus LineStatus);

public record WithdrawalDto(
    int Id,
    string ReferenceNo,
    string AtwNumber,
    int TruckerId,
    string TruckerName,
    int ShippingLineId,
    string ShippingLineName,
    int CurrentDepotId,
    string CurrentDepotName,
    string Destination,
    string IssueDate,
    string ExpirationDate,
    WithdrawalPurpose Purpose,
    WithdrawalStatus Status,
    string? Remarks,
    DateTime CreatedAt,
    DateTime? SubmittedAt,
    bool HasAtwDocument,
    string? ReviewRemarks,
    int ContainerCount,
    string ContainerSummary,
    IReadOnlyList<WithdrawalLineDto> Lines);

public record WithdrawalLineInput(string ContainerNo, int ContainerSizeId, int ContainerTypeId);

public record IssueAtwRequest(
    string? AtwNumber,
    int AuthorizedTruckerId,
    IReadOnlyList<WithdrawalLineInput> Lines,
    int CurrentDepotId,
    string Destination,
    string IssueDate,
    string ExpirationDate,
    string? Remarks);

public record RejectWithdrawalRequest(string Remarks);

public record ReviewWithdrawalRequest(string? Remarks);

public record TruckerLookupDto(int Id, string Name, string Username);

public record EvaluatorAtwLookupsDto(
    ShippingLineLookupDto ShippingLine,
    string NextAtwNumber,
    IReadOnlyList<TruckerLookupDto> Truckers,
    IReadOnlyList<ContainerSizeLookupDto> ContainerSizes,
    IReadOnlyList<ContainerTypeLookupDto> ContainerTypes,
    IReadOnlyList<DepotLookupDto> Depots);

public record CreateWithdrawalRequest(
    string AtwNumber,
    int ShippingLineId,
    IReadOnlyList<WithdrawalLineInput> Lines,
    int CurrentDepotId,
    string Destination,
    string IssueDate,
    string ExpirationDate,
    string? Remarks);

public record UpdateWithdrawalRequest(
    string AtwNumber,
    int ShippingLineId,
    IReadOnlyList<WithdrawalLineInput> Lines,
    int CurrentDepotId,
    string Destination,
    string IssueDate,
    string ExpirationDate,
    string? Remarks);

public record CheckWithdrawalDuplicateRequest(
    int CurrentDepotId,
    string ContainerNo,
    int ContainerSizeId,
    int ContainerTypeId,
    int? ExcludeWithdrawalId);

public record WithdrawalDuplicateCheckDto(
    bool IsDuplicate,
    string? ReferenceNo,
    WithdrawalStatus? Status,
    string? TruckerName);

public record DepotLookupDto(int Id, string Name);

public record WithdrawalLookupsDto(
    IReadOnlyList<ShippingLineLookupDto> ShippingLines,
    IReadOnlyList<ContainerSizeLookupDto> ContainerSizes,
    IReadOnlyList<ContainerTypeLookupDto> ContainerTypes,
    IReadOnlyList<DepotLookupDto> Depots);

public record DestinationLookupDto(string Label, string Category);

public record ShippingLineWithdrawalRulesDto(
    int ShippingLineId,
    int DefaultValidityDays,
    int MaxContainersPerBatch,
    IReadOnlyList<int> ContractDepotIds);

public record WithdrawalFormConfigDto(
    IReadOnlyList<ShippingLineLookupDto> ShippingLines,
    IReadOnlyList<ContainerSizeLookupDto> ContainerSizes,
    IReadOnlyList<ContainerTypeLookupDto> ContainerTypes,
    IReadOnlyList<DepotLookupDto> Depots,
    IReadOnlyList<DestinationLookupDto> Destinations,
    IReadOnlyList<ShippingLineWithdrawalRulesDto> ShippingLineRules);

public record WithdrawalAtwNumberCheckDto(
    bool IsTaken,
    string? ReferenceNo,
    WithdrawalStatus? Status);

public record WithdrawalYardCheckDto(
    bool IsInYard,
    string? Source,
    string? Message);

public record WithdrawalGatePassDto(
    string GateCode,
    string QrPayload,
    string ReferenceNo,
    string AtwNumber,
    string ContainerSummary,
    string ExpiresOn,
    string CurrentDepotName,
    string Destination);

public record WithdrawalDocumentDto(
    int Id,
    int WithdrawalRequestId,
    WithdrawalDocumentType DocumentType,
    string FileName,
    string FilePath,
    string ContentType,
    long FileSize,
    DateTime CreatedAt);
