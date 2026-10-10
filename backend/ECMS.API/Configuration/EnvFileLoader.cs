namespace ECMS.API.Configuration;

public static class EnvFileLoader
{
    public static void LoadIntegrationsEnvIfPresent(IWebHostEnvironment environment)
    {
        LoadEnvFile(Path.Combine(environment.ContentRootPath, ".env.integrations"));
    }

    public static void LoadProductionEnvIfPresent(IWebHostEnvironment environment)
    {
        // Keep local Development on appsettings.Development.json (XAMPP). Production/Railway uses .env.production.
        if (!environment.IsProduction())
            return;

        LoadEnvFile(Path.Combine(environment.ContentRootPath, ".env.production"));

        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("LOGICTECK_API_KEY")))
        {
            var logicteck = Environment.GetEnvironmentVariable("Logicteck__ApiKey");
            if (!string.IsNullOrWhiteSpace(logicteck))
                Environment.SetEnvironmentVariable("LOGICTECK_API_KEY", logicteck);
        }
    }

    private static void LoadEnvFile(string path)
    {
        if (!File.Exists(path))
            return;

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
    }
}
