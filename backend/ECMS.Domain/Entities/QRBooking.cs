using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class QRBooking : BaseEntity
{
    public int ScheduleId { get; set; }
    public string QRCode { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = PhilippinesTime.UtcNow;
    public bool IsUsed { get; set; }
    public DateTime? LogicteckBookedAt { get; set; }
    public string? LogicteckExternalRef { get; set; }

    public Schedule Schedule { get; set; } = null!;
}
