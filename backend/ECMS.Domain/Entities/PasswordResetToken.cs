using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class PasswordResetToken : BaseEntity
{
    public int UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime? UsedAt { get; set; }

    public User User { get; set; } = null!;
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => !IsUsed && !IsExpired;
}
