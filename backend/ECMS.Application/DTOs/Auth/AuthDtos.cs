namespace ECMS.Application.DTOs.Auth;

public record LoginRequest(string Username, string Password);

public record RegisterRequest(
    string Username,
    string Email,
    string Password,
    string FullName,
    string Role,
    int? ShippingLineId = null,
    int? DepotId = null);

public record SignUpRequest(
    string Username,
    string Email,
    string Password,
    string FullName,
    string Role);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User);

public record UserDto(
    int Id,
    string Username,
    string Email,
    string FullName,
    string Role,
    int? ShippingLineId,
    int? DepotId,
    IReadOnlyList<string> AllowedPages);

public record RefreshTokenRequest(string RefreshToken);

public record LogoutRequest(string RefreshToken);

public record ForgotPasswordRequest(string EmailOrUsername);

public record ForgotPasswordResponse(string Message, string? ResetToken = null);

public record ResetPasswordRequest(string Token, string NewPassword);
