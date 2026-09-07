namespace ECMS.Domain.Enums;

public static class RoleNames
{
    public const string ShippingLineEvaluator = "ShippingLineEvaluator";
    public const string DepotPersonnel = "DepotPersonnel";
    public const string Trucker = "Trucker";
    public const string Broker = "Broker";
    public const string Administrator = "Administrator";

    public const string TruckerOrBroker = Trucker + "," + Broker;

    /// <summary>Roles allowed to create and manage pre-forecast (trucker and broker).</summary>
    public const string PreAdviceManager = TruckerOrBroker;

    public static bool IsTruckerOrBroker(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
            return false;

        var normalized = role.Trim();
        return string.Equals(normalized, Trucker, StringComparison.Ordinal)
            || string.Equals(normalized, Broker, StringComparison.Ordinal);
    }

    public static bool IsPreAdviceManager(string role) => IsTruckerOrBroker(role);

    public static string NormalizeTransactionRole(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
            return role;

        if (string.Equals(role, Broker, StringComparison.OrdinalIgnoreCase))
            return Broker;
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
