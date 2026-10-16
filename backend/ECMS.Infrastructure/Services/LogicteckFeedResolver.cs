using ECMS.Application.Configuration;
using ECMS.Domain.Entities;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class LogicteckFeedResolver
{
    private readonly LogicteckOptions _options;

    public LogicteckFeedResolver(IOptions<LogicteckOptions> options)
    {
        _options = options.Value;
    }

    public LogicteckFeedEndpoints ForDepot(Depot depot) =>
        LogicteckFeedEndpoints.ForDepot(
            depot.LogicteckIcsBaseUrl,
            depot.LogicteckAllocationsUrl,
            depot.LogicteckBookingsUrl,
            depot.LogicteckInventoryUrl,
            _options);

    public LogicteckFeedEndpoints Global() => LogicteckFeedEndpoints.FromOptions(_options);
}
