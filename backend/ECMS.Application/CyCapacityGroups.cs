namespace ECMS.Application;

/// <summary>
/// Container sizes that share one CY contract slot pool (each container counts as 1).
/// </summary>
public static class CyCapacityGroups
{
    private static readonly Dictionary<string, string> SecondaryToPrimary = new(StringComparer.OrdinalIgnoreCase)
    {
        ["45"] = "40",
    };

    public static string GetGroupKey(string? sizeLabel)
    {
        var raw = (sizeLabel ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(raw))
            return string.Empty;

        // Reverse GetDisplayLabel — e.g. "40 / 45" must map to the same pool as "40" and "45".
        if (raw.Contains('/'))
        {
            var primarySegment = raw.Split('/')[0].Trim();
            var segmentKey = TeuCalculator.NormalizeLabel(primarySegment);
            return SecondaryToPrimary.GetValueOrDefault(segmentKey, segmentKey);
        }

        var normalized = TeuCalculator.NormalizeLabel(raw);
        return SecondaryToPrimary.GetValueOrDefault(normalized, normalized);
    }

    public static bool IsSecondarySizeKey(string sizeKey)
        => SecondaryToPrimary.ContainsKey(sizeKey);

    public static string GetDisplayLabel(string groupKey)
        => groupKey == "40" ? "40 / 45" : groupKey;

    public static IEnumerable<string> SizeKeysInGroup(string groupKey)
    {
        yield return groupKey;
        foreach (var pair in SecondaryToPrimary)
        {
            if (pair.Value == groupKey)
                yield return pair.Key;
        }
    }
}
