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
    /// <summary>Relative path under /uploads for the booking confirmation PDF generated on payment approval.</summary>
    public string? ConfirmationPdfPath { get; set; }
    /// <summary>When CY gate staff scanned and accepted the trucker for empty return (ICS gate, separate from LOGICTECK IsUsed).</summary>
    public DateTime? GateCheckedInAt { get; set; }
    public int? GateCheckedInByUserId { get; set; }

    public Schedule Schedule { get; set; } = null!;
    public User? GateCheckedInBy { get; set; }
}
