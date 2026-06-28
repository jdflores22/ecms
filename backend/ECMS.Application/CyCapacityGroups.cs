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
        var key = TeuCalculator.NormalizeLabel(sizeLabel ?? string.Empty);
        return SecondaryToPrimary.GetValueOrDefault(key, key);
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
