using MySqlConnector;

namespace ECMS.Persistence;

public static class DatabaseConnection
{
    public static string? Resolve()
    {
        var fromEnv = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (!string.IsNullOrWhiteSpace(fromEnv))
            return fromEnv;

        var host = Environment.GetEnvironmentVariable("MYSQL_HOST");
        if (string.IsNullOrWhiteSpace(host))
            return null;

        var csb = new MySqlConnectionStringBuilder
        {
            Server = host,
            Port = uint.TryParse(Environment.GetEnvironmentVariable("MYSQL_PORT"), out var port) ? port : 3306,
            Database = Environment.GetEnvironmentVariable("MYSQL_DATABASE") ?? "",
            UserID = Environment.GetEnvironmentVariable("MYSQL_USER") ?? "",
            Password = Environment.GetEnvironmentVariable("MYSQL_PASSWORD") ?? "",
            SslMode = MySqlSslMode.Required,
        };

        return string.IsNullOrWhiteSpace(csb.Database) ? null : csb.ConnectionString;
    }

    public static MySqlConnectionStringBuilder Parse(string connectionString) =>
        new(connectionString);
}
