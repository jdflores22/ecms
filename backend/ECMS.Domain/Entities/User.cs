using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public string? FullName { get; set; }
    /// <summary>Relative path under uploads, e.g. /uploads/{guid}.jpg</summary>
    public string? ProfilePhoto { get; set; }
    public int? ShippingLineId { get; set; }
    public int? DepotId { get; set; }

    public Role Role { get; set; } = null!;
    public ShippingLine? ShippingLine { get; set; }
    public Depot? Depot { get; set; }
    public ICollection<PreAdvice> PreAdvices { get; set; } = new List<PreAdvice>();
    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
