using ECMS.Domain.Common;

namespace ECMS.Application;

/// <summary>
/// Depot return-date assignment must respect shipping-line demurrage validity and give truckers lead time.
/// </summary>
public static class DepotScheduleDateRules
{
    public const int MinimumLeadHours = 12;

    public static DateOnly EarliestAssignmentDate(DateTime? referenceUtc = null)
    {
        var now = referenceUtc.HasValue
            ? TimeZoneInfo.ConvertTimeFromUtc(
                referenceUtc.Value.Kind == DateTimeKind.Utc
                    ? referenceUtc.Value
                    : DateTime.SpecifyKind(referenceUtc.Value, DateTimeKind.Utc),
                PhilippinesTime.Zone)
            : PhilippinesTime.Now;

        return DateOnly.FromDateTime(now.AddHours(MinimumLeadHours));
    }

    public static void ValidateAssignmentDate(
        DateOnly date,
        DateOnly? demurrageValidUntil,
        DateOnly? validityStartsOn = null)
    {
        if (!demurrageValidUntil.HasValue)
            throw new InvalidOperationException(
                "Demurrage validity is not set for this pre-forecast. Contact the shipping line evaluator.");

        if (demurrageValidUntil.HasValue && demurrageValidUntil.Value < PhilippinesTime.Today)
            throw new InvalidOperationException(
                "Demurrage validity has expired. Contact the shipping line evaluator.");

        var earliest = EarliestAssignmentDate();
        if (validityStartsOn.HasValue && validityStartsOn.Value > earliest)
            earliest = validityStartsOn.Value;

        if (demurrageValidUntil.HasValue && demurrageValidUntil.Value < earliest)
            throw new InvalidOperationException(
                $"No return dates remain within demurrage validity (valid until {demurrageValidUntil:yyyy-MM-dd}).");

        if (date < earliest)
            throw new InvalidOperationException(
                $"Return date must be at least {MinimumLeadHours} hours from now (earliest: {earliest:yyyy-MM-dd}).");

        if (demurrageValidUntil.HasValue && date > demurrageValidUntil.Value)
            throw new InvalidOperationException(
                $"Return date cannot be after demurrage validity ({demurrageValidUntil:yyyy-MM-dd}).");
    }
}
