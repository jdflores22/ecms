namespace ECMS.API.Configuration;

public static class AppSecrets
{
    public static string Require(IConfiguration configuration, IWebHostEnvironment environment, string configKey, string envVarName)
    {
        var value = Environment.GetEnvironmentVariable(envVarName);
        if (string.IsNullOrWhiteSpace(value))
            value = configuration[configKey];

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Missing secret: set environment variable {envVarName} or {configKey} (use appsettings.Development.json locally).");
        }

        if (environment.IsProduction()
            && (value.Contains("CHANGE-ME", StringComparison.OrdinalIgnoreCase)
                || value.Contains("Dev-Only", StringComparison.OrdinalIgnoreCase)
                || value.Equals("dev-logicteck-local-key", StringComparison.Ordinal)))
        {
            throw new InvalidOperationException(
                $"{configKey} must be set to a production secret via {envVarName}.");
        }

        return value;
    }
}
