using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace ECMS.Persistence;

public static class DatabaseConnection
{
    public static string? ResolveFromConfiguration(IConfiguration config)
    {
        var connectionString = config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
            connectionString = BuildFromMysqlConfig(config);

        return string.IsNullOrWhiteSpace(connectionString) ? Resolve() : connectionString;
    }

    public static string? Resolve()
    {
        var fromEnv = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (!string.IsNullOrWhiteSpace(fromEnv))
            return fromEnv;

        var host = Environment.GetEnvironmentVariable("MYSQL_HOST");
        if (string.IsNullOrWhiteSpace(host))
            return null;

        return BuildFromMysqlParts(
            host,
            Environment.GetEnvironmentVariable("MYSQL_PORT"),
            Environment.GetEnvironmentVariable("MYSQL_DATABASE"),
            Environment.GetEnvironmentVariable("MYSQL_USER"),
            Environment.GetEnvironmentVariable("MYSQL_PASSWORD"),
            sslRequired: true);
    }

    public static string? BuildFromMysqlConfig(IConfiguration config)
    {
        var host = config["MYSQL_HOST"];
        if (string.IsNullOrWhiteSpace(host))
            return null;

        return BuildFromMysqlParts(
            host,
            config["MYSQL_PORT"],
            config["MYSQL_DATABASE"],
            config["MYSQL_USER"],
            config["MYSQL_PASSWORD"],
            sslRequired: true);
    }

    public static string? BuildFromMysqlParts(
        string host,
        string? port,
        string? database,
        string? user,
        string? password,
        bool sslRequired)
    {
        var csb = new MySqlConnectionStringBuilder
        {
            Server = host,
            Port = uint.TryParse(port, out var parsedPort) ? parsedPort : 3306,
            Database = database ?? "",
            UserID = user ?? "",
            Password = password ?? "",
            SslMode = sslRequired ? MySqlSslMode.Required : MySqlSslMode.Preferred,
        };

        return string.IsNullOrWhiteSpace(csb.Database) ? null : csb.ConnectionString;
    }

    public static MySqlConnectionStringBuilder Parse(string connectionString) =>
        new(connectionString);
}
