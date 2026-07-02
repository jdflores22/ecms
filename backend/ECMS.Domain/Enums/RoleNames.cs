namespace ECMS.Domain.Enums;

public static class RoleNames
{
    public const string ShippingLineEvaluator = "ShippingLineEvaluator";
    public const string DepotPersonnel = "DepotPersonnel";
    public const string Trucker = "Trucker";
    public const string Administrator = "Administrator";

    /// <summary>Roles allowed to create and manage pre-forecast (trucker only).</summary>
    public const string PreAdviceManager = Trucker;

    public static bool IsPreAdviceManager(string role) =>
        string.Equals(NormalizeTransactionRole(role), Trucker, StringComparison.Ordinal);

    /// <summary>Maps legacy JWT role claims to the current trucker role.</summary>
    public static string NormalizeTransactionRole(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
            return role;

        // Legacy role alias kept for old tokens/records.
        if (string.Equals(role, "Broker", StringComparison.OrdinalIgnoreCase))
            return Trucker;

        if (string.Equals(role, Trucker, StringComparison.OrdinalIgnoreCase))
            return Trucker;
        if (string.Equals(role, DepotPersonnel, StringComparison.OrdinalIgnoreCase))
            return DepotPersonnel;
        if (string.Equals(role, ShippingLineEvaluator, StringComparison.OrdinalIgnoreCase))
            return ShippingLineEvaluator;
        if (string.Equals(role, Administrator, StringComparison.OrdinalIgnoreCase))
            return Administrator;

        return role.Trim();
    }
}
