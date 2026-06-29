using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ECMS.Persistence;

/// <summary>
/// Used by <c>dotnet ef</c> so migrations do not boot the full API (JWT / LOGICTECK checks).
/// </summary>
public class EcmsDbContextFactory : IDesignTimeDbContextFactory<EcmsDbContext>
{
    public EcmsDbContext CreateDbContext(string[] args)
    {
        EnvFileLoader.LoadProductionEnv();

        var connectionString = DatabaseConnection.Resolve()
            ?? throw new InvalidOperationException(
                "No database connection for migrations. Set ConnectionStrings__DefaultConnection or MYSQL_HOST/MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD in backend/ECMS.API/.env.production or environment variables.");

        var options = new DbContextOptionsBuilder<EcmsDbContext>()
            .UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)))
            .Options;

        return new EcmsDbContext(options);
    }
}

internal static class EnvFileLoader
{
    public static void LoadProductionEnv()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "ECMS.API", ".env.production"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "ECMS.API", ".env.production"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "ECMS.API", ".env.production"),
        };

        foreach (var path in candidates.Select(Path.GetFullPath).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!File.Exists(path)) continue;
            ApplyFile(path);
            return;
        }
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

        // Align Railway-style LOGICTECK env with config key used by Program.cs
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("LOGICTECK_API_KEY")))
        {
            var logicteck = Environment.GetEnvironmentVariable("Logicteck__ApiKey");
            if (!string.IsNullOrWhiteSpace(logicteck))
                Environment.SetEnvironmentVariable("LOGICTECK_API_KEY", logicteck);
        }
    }
}
