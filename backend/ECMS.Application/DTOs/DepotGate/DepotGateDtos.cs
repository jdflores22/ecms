namespace ECMS.Application.DTOs.DepotGate;

public record DepotGateScanRequest(string QrCode);

public record DepotGateIssueDto(
    string Code,
    string Severity,
    string Message);

public record DepotGateScanResponse(
    bool Found,
    string? Message,
    string? QrCode,
    bool CanCheckIn,
    bool AlreadyCheckedIn,
    DateTime? GateCheckedInAt,
    string? GateCheckedInByName,
    IReadOnlyList<DepotGateIssueDto> Issues);

public record DepotGateCheckInResponse(
    bool Success,
    string Message,
    DepotGateScanResponse? Scan);
