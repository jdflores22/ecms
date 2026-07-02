using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class DevicePushToken : BaseEntity
{
    public int UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Platform { get; set; } = "android";
    public string? DeviceName { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
