using ECMS.Application.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace ECMS.API.Filters;

public class LogicteckApiKeyFilter : IAsyncActionFilter
{
    private readonly LogicteckOptions _options;

    public LogicteckApiKeyFilter(IOptions<LogicteckOptions> options)
    {
        _options = options.Value;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
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
