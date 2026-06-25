namespace ECMS.Application;

public static class TeuCalculator
{
  public static decimal FromContainerSize(string? size, IReadOnlyDictionary<string, decimal>? teuByLabel = null)
  {
    if (string.IsNullOrWhiteSpace(size))
      return 2m;

    var normalized = NormalizeLabel(size);
    if (teuByLabel is not null && teuByLabel.TryGetValue(normalized, out var configured))
      return configured;

    if (int.TryParse(normalized, out var feet) && feet <= 20)
      return 1m;

    return 2m;
  }

  public static string NormalizeLabel(string size)
    => size.Trim().TrimEnd('\'', 'f', 'F', 't', 'T');
}
