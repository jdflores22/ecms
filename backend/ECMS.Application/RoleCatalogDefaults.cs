using System.Text.Json;
using ECMS.Domain.Enums;

namespace ECMS.Application;

public static class RolePageKeys
{
    public const string Dashboard = "dashboard";
    public const string Profile = "profile";
    public const string Preforecast = "preforecast";
    public const string Evaluations = "evaluations";
    public const string CyAllocation = "cyAllocation";
    public const string ContainerInventory = "containerInventory";
    public const string DemurrageBilling = "demurrageBilling";
    public const string AdminReports = "adminReports";
    public const string DepotReports = "depotReports";
    public const string EvaluatorReports = "evaluatorReports";
    public const string TruckerReports = "truckerReports";
    public const string DepotDailyReturns = "depotDailyReturns";
    public const string DepotSchedules = "depotSchedules";
    public const string AdminPayments = "adminPayments";
    public const string TruckerReturns = "truckerReturns";
    public const string TruckerPayments = "truckerPayments";
    public const string TruckerDemurrageBilling = "truckerDemurrageBilling";
    public const string TruckerWithdrawals = "truckerWithdrawals";
    public const string EvaluatorAtw = "evaluatorAtw";
    public const string DepotWithdrawals = "depotWithdrawals";
    public const string DepotBroadcasts = "depotBroadcasts";
    public const string TruckerNotifications = "truckerNotifications";
    public const string TruckerQr = "truckerQr";
    public const string TruckerQrPrint = "truckerQrPrint";
    public const string AdminUsers = "adminUsers";
    public const string AdminRoles = "adminRoles";
    public const string AdminMasterData = "adminMasterData";
    public const string AdminAudit = "adminAudit";
    public const string AdminVersion = "adminVersion";
    public const string AdminRevenue = "adminRevenue";

    public static readonly string[] Required = { Dashboard, Profile };

    public static readonly HashSet<string> All = new(StringComparer.Ordinal)
    {
        Dashboard, Profile, Preforecast, Evaluations, CyAllocation, ContainerInventory, DemurrageBilling,
        AdminReports, DepotReports, EvaluatorReports, TruckerReports,
        DepotDailyReturns, DepotSchedules,
        AdminPayments,
        TruckerReturns, TruckerPayments, TruckerDemurrageBilling, TruckerWithdrawals, TruckerQr, TruckerQrPrint,
        EvaluatorAtw, DepotWithdrawals, DepotBroadcasts, TruckerNotifications,
        AdminUsers, AdminRoles, AdminMasterData, AdminAudit, AdminVersion, AdminRevenue,
    };

    public static readonly string[] AdministratorPages =
    {
        Dashboard, Profile, AdminReports,
        AdminPayments, AdminUsers, AdminRoles, AdminMasterData, AdminAudit, AdminVersion, AdminRevenue,
    };

    /// <summary>Legacy RBAC page key mapped to the role-specific reports page.</summary>
    public const string LegacyReports = "reports";

    public static string? MapLegacyPageKey(string roleName, string pageKey)
    {
        if (string.Equals(pageKey, "preadvice", StringComparison.Ordinal))
            return Preforecast;

        if (!string.Equals(pageKey, LegacyReports, StringComparison.Ordinal))
            return pageKey;

        return roleName switch
        {
            RoleNames.Administrator => AdminReports,
            RoleNames.DepotPersonnel => DepotReports,
            RoleNames.ShippingLineEvaluator => EvaluatorReports,
            RoleNames.Trucker => TruckerReports,
            _ => null,
        };
    }
}

public static class RoleCatalogDefaults
{
    public record DefaultRole(
        string Name,
        string Label,
        string Description,
        string[] Capabilities,
        string[] AllowedPages);

    public static readonly DefaultRole[] All =
    {
        new(
            "Administrator",
            "Administrator",
            "System administration: users, master data, payments, revenue, and audit.",
            new[]
            {
                "Manage users and roles",
                "Shipping lines, depots, and container reference data",
                "Verify trucker payment proofs",
                "Payment transaction and revenue reports",
                "Audit log and security oversight",
            },
            RolePageKeys.AdministratorPages),
        new(
            "Trucker",
            "Trucker",
            "Creates pre-forecast, submits ATW withdrawal requests, manages returns, uploads payment proof, and receives booking QR codes.",
            new[]
            {
                "Create and submit pre-forecast",
                "Submit ATW withdrawal requests for repositioning",
                "Upload container identity photos",
                "View assigned return schedules",
                "Upload payment proof",
                "Settle demurrage and detention charges",
                "Download and print QR codes",
                "View operational reports",
            },
            new[]
            {
                RolePageKeys.Dashboard, RolePageKeys.Profile, RolePageKeys.Preforecast, RolePageKeys.TruckerReports,
                RolePageKeys.TruckerReturns, RolePageKeys.TruckerPayments, RolePageKeys.TruckerDemurrageBilling,
                RolePageKeys.TruckerWithdrawals, RolePageKeys.TruckerQr, RolePageKeys.TruckerQrPrint,
                RolePageKeys.TruckerNotifications,
            }),
        new(
            "ShippingLineEvaluator",
            "Shipping Line Evaluator",
            "Reviews pre-forecast for assigned shipping line and assigns CY.",
            new[]
            {
                "Approve or reject pre-forecast",
                "Assign container yard on approval",
                "Set demurrage validity on approval",
                "View demurrage billing for expired returns",
                "View evaluation history",
            },
            new[] { RolePageKeys.Dashboard, RolePageKeys.Profile, RolePageKeys.Evaluations, RolePageKeys.EvaluatorAtw, RolePageKeys.CyAllocation, RolePageKeys.ContainerInventory, RolePageKeys.DemurrageBilling, RolePageKeys.EvaluatorReports }),
        new(
            "DepotPersonnel",
            "Depot Personnel",
            "Schedules returns and manages daily depot operations.",
            new[]
            {
                "Assign schedule slots",
                "Daily returns view",
                "Send depot broadcasts to truckers",
                "Depot reports",
            },
            new[]
            {
                RolePageKeys.Dashboard, RolePageKeys.Profile,
                RolePageKeys.DepotDailyReturns, RolePageKeys.DepotSchedules, RolePageKeys.DepotWithdrawals,
                RolePageKeys.DepotBroadcasts,
                RolePageKeys.DepotReports,
            }),
    };

    public static DefaultRole? Get(string name) =>
        All.FirstOrDefault(r => string.Equals(r.Name, name, StringComparison.Ordinal));
}

public static class RoleCapabilitiesJson
{
    public static List<string> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "[]")
            return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json)?
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    public static List<string> DeserializePages(string roleName, string? json)
    {
        return Deserialize(json)
            .Select(p => RolePageKeys.MapLegacyPageKey(roleName, p) ?? p)
            .Where(RolePageKeys.All.Contains)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static string Serialize(IReadOnlyList<string> capabilities) =>
        JsonSerializer.Serialize(
            capabilities
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(20)
                .ToList());
}

public static class RoleAllowedPagesJson
{
    public static List<string> Deserialize(string? json) => RoleCapabilitiesJson.Deserialize(json);

    public static List<string> DeserializeForRole(string roleName, string? json) =>
        RoleCapabilitiesJson.DeserializePages(roleName, json);

    public static string Serialize(IReadOnlyList<string> pages) =>
        JsonSerializer.Serialize(
            pages
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Where(RolePageKeys.All.Contains)
                .ToList());

    public static List<string> NormalizeForRole(string roleName, IReadOnlyList<string> requested)
    {
        var defaults = RoleCatalogDefaults.Get(roleName);
        var pool = defaults?.AllowedPages.ToHashSet(StringComparer.Ordinal) ?? new HashSet<string>(StringComparer.Ordinal);
        var pages = requested
            .Select(p => RolePageKeys.MapLegacyPageKey(roleName, p) ?? p)
            .Where(p => pool.Contains(p))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        foreach (var required in RolePageKeys.Required)
        {
            if (!pages.Contains(required))
                pages.Insert(0, required);
        }

        if (pages.Contains(RolePageKeys.TruckerQr) && !pages.Contains(RolePageKeys.TruckerQrPrint))
            pages.Add(RolePageKeys.TruckerQrPrint);

        return pages;
    }

    public static List<string> Resolve(string roleName, string? json)
    {
        var defaults = defaultsPages(roleName);
        var stored = DeserializeForRole(roleName, json);
        if (stored.Count > 0)
        {
            var normalized = NormalizeForRole(roleName, stored);
            MergeMissingCatalogPages(roleName, defaults, normalized);
            return normalized;
        }

        return defaults;
    }

    /// <summary>
    /// When the role catalog gains pages, older stored RBAC lists may omit them.
    /// Administrator, Trucker, and ShippingLineEvaluator receive any missing catalog pages.
    /// </summary>
    private static void MergeMissingCatalogPages(string roleName, List<string> defaults, List<string> normalized)
    {
        if (!ShouldMergeCatalogPages(roleName))
            return;

        foreach (var page in defaults)
        {
            if (!normalized.Contains(page))
                normalized.Add(page);
        }
    }

    private static bool ShouldMergeCatalogPages(string roleName) =>
        string.Equals(roleName, RoleNames.Administrator, StringComparison.Ordinal)
        || string.Equals(roleName, RoleNames.Trucker, StringComparison.Ordinal)
        || string.Equals(roleName, RoleNames.ShippingLineEvaluator, StringComparison.Ordinal)
        || string.Equals(roleName, RoleNames.DepotPersonnel, StringComparison.Ordinal);

    public static List<string> defaultsPages(string roleName) =>
        RoleCatalogDefaults.Get(roleName)?.AllowedPages.ToList() ?? RolePageKeys.Required.ToList();
}
