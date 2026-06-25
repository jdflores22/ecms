using System.Text.Json;

namespace ECMS.Application;

public static class RolePageKeys
{
    public const string Dashboard = "dashboard";
    public const string Profile = "profile";
    public const string Preadvice = "preadvice";
    public const string Evaluations = "evaluations";
    public const string CyAllocation = "cyAllocation";
    public const string ContainerInventory = "containerInventory";
    public const string Reports = "reports";
    public const string DepotDailyReturns = "depotDailyReturns";
    public const string DepotSchedules = "depotSchedules";
    public const string DepotPayments = "depotPayments";
    public const string TruckerReturns = "truckerReturns";
    public const string TruckerPayments = "truckerPayments";
    public const string TruckerQr = "truckerQr";
    public const string TruckerQrPrint = "truckerQrPrint";
    public const string AdminUsers = "adminUsers";
    public const string AdminRoles = "adminRoles";
    public const string AdminMasterData = "adminMasterData";
    public const string AdminAudit = "adminAudit";

    public static readonly string[] Required = { Dashboard, Profile };

    public static readonly HashSet<string> All = new(StringComparer.Ordinal)
    {
        Dashboard, Profile, Preadvice, Evaluations, CyAllocation, ContainerInventory, Reports,
        DepotDailyReturns, DepotSchedules, DepotPayments,
        TruckerReturns, TruckerPayments, TruckerQr, TruckerQrPrint,
        AdminUsers, AdminRoles, AdminMasterData, AdminAudit,
    };
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
            "Full system access for user, master data, and audit oversight.",
            new[]
            {
                "Manage users and roles",
                "Shipping lines, depots, containers",
                "View reports and audit log",
                "All depot and evaluation functions",
            },
            RolePageKeys.All.ToArray()),
        new(
            "Trucker",
            "Trucker",
            "Creates pre-advice, manages returns, uploads payment proof, and receives booking QR codes.",
            new[]
            {
                "Create and submit pre-advice",
                "Upload container identity photos",
                "View assigned return schedules",
                "Upload payment proof",
                "Download and print QR codes",
                "View operational reports",
            },
            new[]
            {
                RolePageKeys.Dashboard, RolePageKeys.Profile, RolePageKeys.Preadvice, RolePageKeys.Reports,
                RolePageKeys.TruckerReturns, RolePageKeys.TruckerPayments,
                RolePageKeys.TruckerQr, RolePageKeys.TruckerQrPrint,
            }),
        new(
            "ShippingLineEvaluator",
            "Shipping Line Evaluator",
            "Reviews pre-advice for assigned shipping line and assigns CY.",
            new[]
            {
                "Approve or reject pre-advice",
                "Assign container yard on approval",
                "View evaluation history",
            },
            new[] { RolePageKeys.Dashboard, RolePageKeys.Profile, RolePageKeys.Evaluations, RolePageKeys.CyAllocation, RolePageKeys.ContainerInventory, RolePageKeys.Reports }),
        new(
            "DepotPersonnel",
            "Depot Personnel",
            "Schedules returns, verifies payments, and manages daily operations.",
            new[]
            {
                "Assign schedule slots",
                "Verify trucker payments",
                "Daily returns view",
                "Depot reports",
            },
            new[]
            {
                RolePageKeys.Dashboard, RolePageKeys.Profile,
                RolePageKeys.DepotDailyReturns, RolePageKeys.DepotSchedules,
                RolePageKeys.DepotPayments, RolePageKeys.Reports,
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
        var stored = Deserialize(json);
        if (stored.Count > 0)
        {
            var normalized = NormalizeForRole(roleName, stored);
            MergeMissingCatalogPages(roleName, defaults, normalized);
            return normalized;
        }

        return defaults;
    }

    /// <summary>
    /// When the role catalog gains pages (e.g. Broker merged into Trucker), older stored RBAC
    /// lists may omit them. Trucker always receives the full catalog so nav and routes stay aligned.
    /// </summary>
    private static void MergeMissingCatalogPages(string roleName, List<string> defaults, List<string> normalized)
    {
        if (!string.Equals(roleName, "Trucker", StringComparison.Ordinal)
            && !string.Equals(roleName, "ShippingLineEvaluator", StringComparison.Ordinal))
            return;

        foreach (var page in defaults)
        {
            if (!normalized.Contains(page))
                normalized.Add(page);
        }
    }

    public static List<string> defaultsPages(string roleName) =>
        RoleCatalogDefaults.Get(roleName)?.AllowedPages.ToList() ?? RolePageKeys.Required.ToList();
}
