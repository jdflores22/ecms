using ECMS.Application;
using ECMS.Application.DTOs.Auth;
using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using ECMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IEcmsDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditService _auditService;

    public AuthService(IEcmsDbContext db, ITokenService tokenService, IPasswordHasher passwordHasher, IAuditService auditService)
    {
        _db = db;
        _tokenService = tokenService;
        _passwordHasher = passwordHasher;
        _auditService = auditService;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Username == request.Username, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid username or password.");

        if (user.Status != UserStatus.Active || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid username or password.");

        return await CreateAuthResponseAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        if (await _db.Users.AnyAsync(u => u.Username == request.Username || u.Email == request.Email, cancellationToken))
            throw new InvalidOperationException("Username or email already exists.");

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.Role, cancellationToken)
            ?? throw new InvalidOperationException("Invalid role.");

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            FullName = request.FullName,
            RoleId = role.Id,
            ShippingLineId = request.ShippingLineId,
            DepotId = request.DepotId
        };

        _db.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        user.Role = role;
        await _auditService.LogAsync(user.Id, "Register", "Auth", $"User {user.Username} registered", cancellationToken);
        return await CreateAuthResponseAsync(user, cancellationToken);
    }

    public async Task<AuthResponse> SignUpAsync(SignUpRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Role is not RoleNames.Trucker)
            throw new InvalidOperationException("Self-service sign-up is only available for trucker accounts.");

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.FullName))
            throw new InvalidOperationException("Full name, username, and email are required.");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters.");

        return await RegisterAsync(
            new RegisterRequest(
                request.Username.Trim(),
                request.Email.Trim(),
                request.Password,
                request.FullName.Trim(),
                request.Role),
            cancellationToken);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        var stored = await _db.RefreshTokens
            .Include(r => r.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        if (!stored.IsActive)
            throw new UnauthorizedAccessException("Refresh token expired or revoked.");

        stored.IsRevoked = true;
        stored.RevokedAt = DateTime.UtcNow;
        _db.Update(stored);
        await _db.SaveChangesAsync(cancellationToken);

        return await CreateAuthResponseAsync(stored.User, cancellationToken);
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == request.RefreshToken, cancellationToken);
        if (stored is null) return;

        stored.IsRevoked = true;
        stored.RevokedAt = DateTime.UtcNow;
        _db.Update(stored);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(stored.UserId, "Logout", "Auth", null, cancellationToken);
    }

    public async Task<ForgotPasswordResponse> RequestPasswordResetAsync(
        ForgotPasswordRequest request,
        bool includeResetToken,
        CancellationToken cancellationToken = default)
    {
        const string message = "If an account exists for that username or email, password reset instructions have been sent.";

        if (string.IsNullOrWhiteSpace(request.EmailOrUsername))
            return new ForgotPasswordResponse(message);

        var identifier = request.EmailOrUsername.Trim();
        var user = await _db.Users.FirstOrDefaultAsync(
            u => u.Username == identifier || u.Email == identifier,
            cancellationToken);

        if (user is null || user.Status != UserStatus.Active)
            return new ForgotPasswordResponse(message);

        var existingTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.IsUsed)
            .ToListAsync(cancellationToken);

        foreach (var token in existingTokens)
        {
            token.IsUsed = true;
            token.UsedAt = DateTime.UtcNow;
            _db.Update(token);
        }

        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = _tokenService.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
        };

        _db.Add(resetToken);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(user.Id, "RequestPasswordReset", "Auth", null, cancellationToken);

        return new ForgotPasswordResponse(message, includeResetToken ? resetToken.Token : null);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            throw new InvalidOperationException("Reset token is required.");

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters.");

        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.Token, cancellationToken)
            ?? throw new InvalidOperationException("Invalid or expired reset token.");

        if (!resetToken.IsActive)
            throw new InvalidOperationException("Invalid or expired reset token.");

        if (resetToken.User.Status != UserStatus.Active)
            throw new InvalidOperationException("Account is not active.");

        resetToken.User.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        resetToken.IsUsed = true;
        resetToken.UsedAt = DateTime.UtcNow;

        var refreshTokens = await _db.RefreshTokens
            .Where(r => r.UserId == resetToken.UserId && !r.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var refreshToken in refreshTokens)
        {
            refreshToken.IsRevoked = true;
            refreshToken.RevokedAt = DateTime.UtcNow;
            _db.Update(refreshToken);
        }

        _db.Update(resetToken.User);
        _db.Update(resetToken);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(resetToken.UserId, "ResetPassword", "Auth", null, cancellationToken);
    }

    private async Task<AuthResponse> CreateAuthResponseAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = _tokenService.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _db.Add(refreshToken);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(user.Id, "Login", "Auth", null, cancellationToken);

        return new AuthResponse(
            accessToken,
            refreshToken.Token,
            _tokenService.GetAccessTokenExpiry(),
            new UserDto(
                user.Id,
                user.Username,
                user.Email,
                user.FullName ?? user.Username,
                user.Role.Name,
                user.ShippingLineId,
                user.DepotId,
                RoleAllowedPagesJson.Resolve(user.Role.Name, user.Role.AllowedPagesJson)));
    }
}
