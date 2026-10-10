using ECMS.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ECMS.API.Filters;

public enum PortalFeature
{
    Soa,
    Withdrawals,
}

public sealed class RequirePortalFeatureAttribute : TypeFilterAttribute
{
    public RequirePortalFeatureAttribute(PortalFeature feature)
        : base(typeof(PortalFeatureFilter))
    {
        Arguments = new object[] { feature };
    }
}

public sealed class PortalFeatureFilter : IAsyncActionFilter
{
    private readonly PortalFeature _feature;
    private readonly IPortalSettingsService _portalSettings;

    public PortalFeatureFilter(PortalFeature feature, IPortalSettingsService portalSettings)
    {
        _feature = feature;
        _portalSettings = portalSettings;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var enabled = _feature switch
        {
            PortalFeature.Soa => await _portalSettings.IsSoaEnabledAsync(context.HttpContext.RequestAborted),
            PortalFeature.Withdrawals => await _portalSettings.IsWithdrawalsEnabledAsync(context.HttpContext.RequestAborted),
            _ => true,
        };

        if (!enabled)
        {
            context.Result = new ObjectResult(new
            {
                message = _feature switch
                {
                    PortalFeature.Soa => "Statements of account (SOA) are not enabled on this portal.",
                    PortalFeature.Withdrawals => "Withdrawals are not enabled on this portal.",
                    _ => "This feature is not enabled on this portal.",
                },
            })
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
            return;
        }

        await next();
    }
}
