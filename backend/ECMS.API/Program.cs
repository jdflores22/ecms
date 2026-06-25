using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using ECMS.Infrastructure;
using ECMS.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var mysqlHost = builder.Configuration["MYSQL_HOST"];
if (!string.IsNullOrWhiteSpace(mysqlHost))
{
    var csb = new MySqlConnectionStringBuilder
    {
        Server = mysqlHost,
        Port = uint.TryParse(builder.Configuration["MYSQL_PORT"], out var p) ? p : 3306,
        Database = builder.Configuration["MYSQL_DATABASE"] ?? "",
        UserID = builder.Configuration["MYSQL_USER"] ?? "",
        Password = builder.Configuration["MYSQL_PASSWORD"] ?? "",
        SslMode = MySqlSslMode.Required,
    };
    connectionString = csb.ConnectionString;
}

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Set ConnectionStrings__DefaultConnection or MYSQL_HOST/MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD.");

var mysqlTarget = new MySqlConnectionStringBuilder(connectionString);
builder.Logging.AddConsole();
builder.Services.AddPersistence(connectionString);
builder.Services.AddInfrastructure();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
        var productionOrigins = new[]
        {
            "https://deepskyblue-marten-415020.hostingersite.com",
            "https://www.deepskyblue-marten-415020.hostingersite.com",
        };
        policy.WithOrigins(origins.Concat(productionOrigins).Distinct(StringComparer.OrdinalIgnoreCase).ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = ClaimTypes.Role,
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
startupLogger.LogInformation(
    "ICS API starting. Environment={Environment}, MySQL={Server}:{Port}/{Database}",
    app.Environment.EnvironmentName,
    mysqlTarget.Server,
    mysqlTarget.Port,
    mysqlTarget.Database);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = "An internal server error occurred." });
        });
    });
}

app.UseCors("Frontend");

var uploadPath = Path.Combine(app.Environment.ContentRootPath, builder.Configuration["FileStorage:UploadPath"] ?? "uploads");
Directory.CreateDirectory(uploadPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
            await seeder.SeedAsync();
            startupLogger.LogInformation("Database migrate/seed completed.");
        }
        catch (Exception ex)
        {
            startupLogger.LogCritical(
                ex,
                "Database migrate/seed failed. Verify ConnectionStrings__DefaultConnection in Railway Variables (password with # must be pasted exactly).");
        }
    });
});

app.Run();

public partial class Program { }
