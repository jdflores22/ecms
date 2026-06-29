using ECMS.Application.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace ECMS.API.Filters;

public class LogicteckApiKeyFilter : IAsyncActionFilter
{
    private readonly LogicteckOptions _options;
    private readonly IWebHostEnvironment _environment;

    public LogicteckApiKeyFilter(IOptions<LogicteckOptions> options, IWebHostEnvironment environment)
    {
        _options = options.Value;
        _environment = environment;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            if (_environment.IsProduction())
            {
                context.Result = new ObjectResult(new { message = "LOGICTECK integration is not configured." })
                {
                    StatusCode = StatusCodes.Status503ServiceUnavailable,
                };
                return;
            }

            await next();
            return;
        }

        if (!context.HttpContext.Request.Headers.TryGetValue("X-Logicteck-Api-Key", out var providedKey)
            || !string.Equals(providedKey.ToString(), _options.ApiKey, StringComparison.Ordinal))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Invalid or missing LOGICTECK API key." });
            return;
        }

        await next();
    }
}
