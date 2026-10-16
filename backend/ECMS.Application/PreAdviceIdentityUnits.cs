using ECMS.Domain.Enums;

namespace ECMS.Application;

public static class PreAdviceIdentityUnits
{
    public static bool TryParse(string? value, out PreAdviceIdentityUnit unit)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            unit = PreAdviceIdentityUnit.Primary;
            return true;
        }

        return Enum.TryParse(value, true, out unit);
    }

    public static string GetLabel(PreAdviceIdentityUnit unit) => unit switch
    {
        PreAdviceIdentityUnit.Companion => "Companion",
        _ => "Primary",
    };
}
