using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using ECMS.API.Configuration;
using ECMS.API.Middleware;
using ECMS.Application.Interfaces;
using ECMS.Infrastructure;
using ECMS.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);

EnvFileLoader.LoadProductionEnvIfPresent(builder.Environment);

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
    connectionString = DatabaseConnection.Resolve();

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Set ConnectionStrings__DefaultConnection or MYSQL_HOST/MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD.");

var mysqlTarget = new MySqlConnectionStringBuilder(connectionString);
builder.Logging.AddConsole();
builder.Services.AddPersistence(connectionString);
builder.Services.AddInfrastructure();
builder.Services.Configure<ECMS.Application.Configuration.LogicteckOptions>(
    builder.Configuration.GetSection(ECMS.Application.Configuration.LogicteckOptions.SectionName));
builder.Services.PostConfigure<ECMS.Application.Configuration.LogicteckOptions>(options =>
{
    var envKey = Environment.GetEnvironmentVariable("LOGICTECK_API_KEY");
    if (!string.IsNullOrWhiteSpace(envKey))
        options.ApiKey = envKey;
});

builder.Services.Configure<ECMS.Application.Configuration.FirebasePushOptions>(options =>
{
    var envJson = Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_JSON");
    if (!string.IsNullOrWhiteSpace(envJson))
        options.CredentialsJson = envJson;
    else
        options.CredentialsJson = builder.Configuration["Firebase:CredentialsJson"];
});

if (builder.Environment.IsProduction()
    && string.IsNullOrWhiteSpace(
        Environment.GetEnvironmentVariable("LOGICTECK_API_KEY") ?? builder.Configuration["Logicteck:ApiKey"]))
{
    throw new InvalidOperationException("Set LOGICTECK_API_KEY for production.");
}

builder.Services.AddScoped<ECMS.API.Filters.LogicteckApiKeyFilter>();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
var productionOrigins = new[]
{
    "https://deepskyblue-marten-415020.hostingersite.com",
    "https://www.deepskyblue-marten-415020.hostingersite.com",
};
var allowedOrigins = corsOrigins.Concat(productionOrigins).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());

    // LOGICTECK + logicteck-test.html: API-key auth only (no cookies). Allow browser calls from any origin.
    options.AddPolicy("LogicteckPublic", policy =>
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var jwtKey = AppSecrets.Require(
    builder.Configuration,
    builder.Environment,
    "Jwt:Key",
    "JWT_KEY");
// JWT_KEY (e.g. from .env.production) must match token signing — AppSecrets reads env first,
// but JwtTokenService reads IConfiguration["Jwt:Key"] which may still be the dev appsettings value.
builder.Configuration["Jwt:Key"] = jwtKey;
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

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    var isDev = builder.Environment.IsDevelopment();

    // Login/signup/password reset — keep stricter in production (brute-force protection).
    options.AddPolicy("auth-login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = isDev ? 100 : 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    // Token refresh — separate bucket so refresh retries cannot block login.
    options.AddPolicy("auth-refresh", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = isDev ? 120 : 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

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

// Default policy for JWT endpoints; LogicteckController uses [EnableCors("LogicteckPublic")] per-endpoint.
app.UseCors();
app.UseRateLimiter();

var uploadPath = Path.Combine(app.Environment.ContentRootPath, builder.Configuration["FileStorage:UploadPath"] ?? "uploads");
Directory.CreateDirectory(uploadPath);
app.UseMiddleware<UploadAccessMiddleware>();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadPath),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        var origin = ctx.Context.Request.Headers.Origin.ToString();
        if (string.IsNullOrEmpty(origin)) return;
        if (!allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return;
        ctx.Context.Response.Headers.AccessControlAllowOrigin = origin;
        ctx.Context.Response.Headers.AccessControlAllowCredentials = "true";
        ctx.Context.Response.Headers.Vary = "Origin";
    },
});

app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EcmsDbContext>();
    await ProductionSchemaRepair.ApplyAsync(db, startupLogger);

    try
    {
        var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
        await seeder.SeedAsync();
        startupLogger.LogInformation("Database migrate/seed completed.");
    }
    catch (Exception ex)
    {
        startupLogger.LogError(
            ex,
            "Database migrate/seed failed after schema repair. Import scripts/payment-schedule-migrations-idempotent.sql if endpoints still return 500.");
    }

    try
    {
        var demurrageBilling = scope.ServiceProvider.GetRequiredService<IDemurrageBillingService>();
        await demurrageBilling.SyncExpiredBillingsAsync();
        startupLogger.LogInformation("Demurrage billing sync completed.");
    }
    catch (Exception ex)
    {
        startupLogger.LogWarning(ex, "Demurrage billing sync skipped.");
    }
}

app.Run();

public partial class Program { }
