using ECMS.Application.Interfaces;
using ECMS.Infrastructure.Security;
using ECMS.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace ECMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IQrService, QrCodeService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPreAdviceService, PreAdviceService>();
        services.AddScoped<IEvaluationService, EvaluationService>();
        services.AddScoped<IScheduleService, ScheduleService>();
        services.AddScoped<ISlotCapacityService, SlotCapacityService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IDepotService, DepotService>();
        services.AddScoped<IShippingLineService, ShippingLineService>();
        services.AddScoped<IContainerService, ContainerService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IReportService, ReportService>();

        return services;
    }
}
