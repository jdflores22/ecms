namespace ECMS.Domain.Enums;

public static class RoleNames
{
    public const string ShippingLineEvaluator = "ShippingLineEvaluator";
    public const string DepotPersonnel = "DepotPersonnel";
    public const string Trucker = "Trucker";
    public const string Administrator = "Administrator";

    /// <summary>Roles allowed to create and manage pre-advice (trucker only).</summary>
    public const string PreAdviceManager = Trucker;

    public static bool IsPreAdviceManager(string role) =>
        string.Equals(NormalizeTransactionRole(role), Trucker, StringComparison.Ordinal);

    /// <summary>Maps legacy JWT role claims to the current trucker role.</summary>
    public static string NormalizeTransactionRole(string role) =>
        string.Equals(role, "Broker", StringComparison.Ordinal) ? Trucker : role;
}
