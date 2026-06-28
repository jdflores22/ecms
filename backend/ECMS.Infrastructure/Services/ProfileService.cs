using ECMS.Application.DTOs.User;
using ECMS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Infrastructure.Services;

public class ProfileService : IProfileService
{
    private readonly IEcmsDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditService _auditService;

    public ProfileService(IEcmsDbContext db, IPasswordHasher passwordHasher, IAuditService auditService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _auditService = auditService;
    }

    public async Task<ProfileDto?> GetAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.ShippingLine)
            .Include(u => u.Depot)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        return user is null ? null : MapProfile(user);
    }

    public async Task<ProfileDto?> UpdateAsync(
        int userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.ShippingLine)
            .Include(u => u.Depot)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null) return null;

        var email = request.Email.Trim();
        var fullName = request.FullName.Trim();

        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Email is required.");

        if (string.IsNullOrWhiteSpace(fullName))
            throw new InvalidOperationException("Full name is required.");

        if (await _db.Users.AnyAsync(u => u.Id != userId && u.Email == email, cancellationToken))
            throw new InvalidOperationException("Email is already in use.");

        user.Email = email;
        user.FullName = fullName;

        _db.Update(user);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "UpdateProfile", "Profile", user.Username, cancellationToken);

        return MapProfile(user);
    }

    public async Task ChangePasswordAsync(
        int userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("Current password is incorrect.");

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            throw new InvalidOperationException("New password must be at least 8 characters.");

        if (request.NewPassword == request.CurrentPassword)
            throw new InvalidOperationException("New password must be different from the current password.");

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);
        _db.Update(user);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "ChangePassword", "Profile", user.Username, cancellationToken);
    }

    public async Task<ProfileDto?> UploadPhotoAsync(
        int userId,
        string relativePhotoPath,
        string contentRoot,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.ShippingLine)
            .Include(u => u.Depot)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null) return null;

        DeleteProfilePhotoFile(contentRoot, user.ProfilePhoto);
        user.ProfilePhoto = relativePhotoPath;

        _db.Update(user);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "UploadProfilePhoto", "Profile", user.Username, cancellationToken);

        return MapProfile(user);
    }

    public async Task<ProfileDto?> RemovePhotoAsync(
        int userId,
        string contentRoot,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .Include(u => u.ShippingLine)
            .Include(u => u.Depot)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null) return null;

        DeleteProfilePhotoFile(contentRoot, user.ProfilePhoto);
        user.ProfilePhoto = null;

        _db.Update(user);
        await _db.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(userId, "RemoveProfilePhoto", "Profile", user.Username, cancellationToken);

        return MapProfile(user);
    }

    private static void DeleteProfilePhotoFile(string contentRoot, string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return;

        var absolute = Path.Combine(contentRoot, relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(absolute))
        {
            try { File.Delete(absolute); } catch { /* best effort */ }
        }
    }

    private static ProfileDto MapProfile(Domain.Entities.User user) => new(
        user.Id,
        user.Username,
        user.Email,
        user.FullName ?? user.Username,
        user.Role.Name,
        user.Status.ToString(),
        user.ShippingLineId,
        user.ShippingLine?.Name,
        user.DepotId,
        user.Depot?.Name,
        user.ProfilePhoto,
        user.CreatedAt);
}
