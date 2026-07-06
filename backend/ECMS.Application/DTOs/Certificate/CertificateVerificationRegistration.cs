namespace ECMS.Application.DTOs.Certificate;

public record CertificateVerificationRegistration(
    string AtwNumber,
    string ReferenceNo,
    string ShippingLineName,
    string TruckerName,
    string DepotName,
    string ContainerNo = "",
    string ContainerSize = "",
    string ContainerType = "",
    string Destination = "",
    int? WithdrawalRequestLineId = null);
