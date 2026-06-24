using ECMS.Application.DTOs.Auth;

namespace ECMS.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> SignUpAsync(SignUpRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default);
    Task<ForgotPasswordResponse> RequestPasswordResetAsync(ForgotPasswordRequest request, bool includeResetToken, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
}
