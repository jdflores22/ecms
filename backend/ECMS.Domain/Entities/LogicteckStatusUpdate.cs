using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class LogicteckStatusUpdate : BaseEntity
{
    public int QRBookingId { get; set; }
    public string? EventId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string? Message { get; set; }
    public DateTime OccurredAt { get; set; }

    public QRBooking QRBooking { get; set; } = null!;
}
