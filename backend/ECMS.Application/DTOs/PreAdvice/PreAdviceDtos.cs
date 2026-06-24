using ECMS.Domain.Enums;

namespace ECMS.Application.DTOs.PreAdvice;

public record PreAdviceDto(
    int Id,
    string ReferenceNo,
    int BrokerId,
    string BrokerName,
    int ShippingLineId,
    string ShippingLineName,
    int ContainerId,
    string ContainerNo,
    string ContainerSize,
    string ContainerType,
    PreAdviceStatus Status,
    string? Remarks,
    DateTime CreatedAt);

public record CreatePreAdviceRequest(
    int ShippingLineId,
    int ContainerId,
    string? Remarks);

public record UpdatePreAdviceRequest(
    int ShippingLineId,
    int ContainerId,
    string? Remarks);

public record CancelPreAdviceRequest(string? Reason);

public record ShippingLineLookupDto(int Id, string Name, string Code);

public record ContainerLookupDto(
    int Id,
    string ContainerNo,
    string Size,
    string Type,
    int ShippingLineId);

public record PreAdviceLookupsDto(
    IReadOnlyList<ShippingLineLookupDto> ShippingLines,
    IReadOnlyList<ContainerLookupDto> Containers);

public record PreAdviceDocumentDto(
    int Id,
    int PreAdviceId,
    string? Category,
    string? CategoryLabel,
    string? Comment,
    string FileName,
    string FilePath,
    string ContentType,
    long FileSize,
    string UploadedByName,
    DateTime CreatedAt);
