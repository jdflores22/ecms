namespace ECMS.Application.DTOs.Portal;

public record PortalSettingsDto(
    bool IcsCroEdoQrEnabled,
    bool SoaEnabled,
    bool WithdrawalsEnabled,
    DateTime UpdatedAt);

public record UpdatePortalSettingsRequest(
    bool IcsCroEdoQrEnabled,
    bool SoaEnabled,
    bool WithdrawalsEnabled,
    string? DeveloperPassword);
