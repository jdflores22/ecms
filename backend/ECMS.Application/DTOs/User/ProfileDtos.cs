namespace ECMS.Application.DTOs.User;

public record ProfileDto(
    int Id,
    string Username,
    string Email,
    string FullName,
    string Role,
    string Status,
    int? ShippingLineId,
    string? ShippingLineName,
    int? DepotId,
    string? DepotName,
    string? ProfilePhoto,
    DateTime CreatedAt);

public record UpdateProfileRequest(string Email, string FullName);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
