using ECMS.Domain.Entities;
using ECMS.Domain.Enums;

namespace ECMS.Infrastructure.Services;

/// <summary>
/// Workflow return containers count as CY yard inventory only after depot gate check-in.
/// </summary>
internal static class YardInventoryWorkflowHelper
{
    public static bool IsPhysicallyAtYard(Schedule schedule) =>
        schedule.Status == ScheduleStatus.Completed
        && schedule.PreAdvice.Status == PreAdviceStatus.Approved
        && schedule.QRBooking?.GateCheckedInAt != null;
}
