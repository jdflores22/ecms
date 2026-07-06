using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ECMS.Persistence;

/// <summary>
/// Used by <c>dotnet ef</c> so migrations do not boot the full API (JWT / LOGICTECK checks).
/// Defaults to <c>appsettings.Development.json</c> (local MySQL) unless
/// <c>ASPNETCORE_ENVIRONMENT=Production</c>.
/// </summary>
public class EcmsDbContextFactory : IDesignTimeDbContextFactory<EcmsDbContext>
{
    public EcmsDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        var apiRoot = FindApiContentRoot()
            ?? throw new InvalidOperationException("Could not find ECMS.API appsettings for migrations.");

        if (string.Equals(environment, "Production", StringComparison.OrdinalIgnoreCase))
            EnvFileLoader.LoadProductionEnv(apiRoot);

        var config = new ConfigurationBuilder()
            .SetBasePath(apiRoot)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = DatabaseConnection.ResolveFromConfiguration(config)
            ?? throw new InvalidOperationException(
                "No database connection for migrations. Use appsettings.Development.json (local) or set ASPNETCORE_ENVIRONMENT=Production with backend/ECMS.API/.env.production.");

        var options = new DbContextOptionsBuilder<EcmsDbContext>()
            .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)))
            .Options;

        return new EcmsDbContext(options);
    }

    private static string? FindApiContentRoot()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "ECMS.API"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "ECMS.API"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "ECMS.API"),
        };

        foreach (var path in candidates.Select(Path.GetFullPath).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (File.Exists(Path.Combine(path, "appsettings.json")))
                return path;
        }

        return null;
    }
}

internal static class EnvFileLoader
{
    public static void LoadProductionEnv(string apiRoot)
    {
        var path = Path.Combine(apiRoot, ".env.production");
        if (!File.Exists(path))
            return;

        ApplyFile(path);
    }

    private static void ApplyFile(string path)
    {
        foreach (var rawLine in File.ReadAllLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;

            var eq = line.IndexOf('=');
            if (eq < 1) continue;

            var key = line[..eq].Trim();
            var value = line[(eq + 1)..].Trim();
            if ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\'')))
                value = value[1..^1];

            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, value);
        }

        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("LOGICTECK_API_KEY")))
        {
            var logicteck = Environment.GetEnvironmentVariable("Logicteck__ApiKey");
            if (!string.IsNullOrWhiteSpace(logicteck))
                Environment.SetEnvironmentVariable("LOGICTECK_API_KEY", logicteck);
        }
    }
}
