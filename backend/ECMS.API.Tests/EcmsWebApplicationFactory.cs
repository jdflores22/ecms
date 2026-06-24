using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace ECMS.API.Tests;

public class EcmsWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string TestConnectionString =
        "Server=localhost;Port=3306;Database=ecms_test;User=root;Password=;";

    public EcmsWebApplicationFactory()
    {
        EnsureTestDatabaseExists();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = TestConnectionString,
            });
        });
    }

    private static void EnsureTestDatabaseExists()
    {
        var builder = new MySqlConnectionStringBuilder(TestConnectionString);
        var database = builder.Database;
        builder.Database = "mysql";

        using var connection = new MySqlConnection(builder.ConnectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = $"CREATE DATABASE IF NOT EXISTS `{database}`";
        command.ExecuteNonQuery();
    }
}
