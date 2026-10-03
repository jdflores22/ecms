using ECMS.Application.DTOs.Auth;

namespace ECMS.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<SignUpResponse> SignUpAsync(SignUpRequest request, bool includeVerificationToken, CancellationToken cancellationToken = default);
    Task VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default);
    Task<SignUpResponse> ResendVerificationAsync(ResendVerificationRequest request, bool includeVerificationToken, CancellationToken cancellationToken = default);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default);
    Task<ForgotPasswordResponse> RequestPasswordResetAsync(ForgotPasswordRequest request, bool includeResetToken, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
}
