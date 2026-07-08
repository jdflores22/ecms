using ECMS.Application.Interfaces;
using ECMS.Infrastructure.Security;
using ECMS.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace ECMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<PythonOcrEnsembleClient>();
        services.AddMemoryCache();
        services.AddSingleton<IUploadUrlSigner, UploadUrlSigner>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IUploadAccessService, UploadAccessService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IPushNotificationService, FcmPushNotificationService>();
        services.AddHttpClient<LogicteckOutboundClient>();
        services.AddScoped<IQrService, QrCodeService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPreAdviceService, PreAdviceService>();
        services.AddScoped<IEvaluationService, EvaluationService>();
        services.AddScoped<IScheduleService, ScheduleService>();
        services.AddScoped<ISlotCapacityService, SlotCapacityService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IDemurrageBillingService, DemurrageBillingService>();
        services.AddScoped<IWithdrawalService, WithdrawalService>();
        services.AddScoped<ICertificateTemplateService, CertificateTemplateService>();
        services.AddScoped<ICertificateGenerationService, CertificateGenerationService>();
        services.AddScoped<ICertificateVerificationService, CertificateVerificationService>();
        services.AddScoped<IPaymentSettingsService, PaymentSettingsService>();
        services.AddScoped<IPaymentProofExtractionService, PaymentProofExtractionService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IDepotBroadcastService, DepotBroadcastService>();
        services.AddScoped<ITruckerNewsService, TruckerNewsService>();
        services.AddScoped<IShippingLineService, ShippingLineService>();
        services.AddScoped<IContainerService, ContainerService>();
        services.AddScoped<IContainerSizeService, ContainerSizeService>();
        services.AddScoped<IContainerTypeService, ContainerTypeService>();
        services.AddScoped<ICyAllocationService, CyAllocationService>();
        services.AddScoped<IContainerInventoryService, ContainerInventoryService>();
        services.AddScoped<IShippingLineDepotContractService, ShippingLineDepotContractService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<ILogicteckEmptyReturnService, LogicteckEmptyReturnService>();

        return services;
    }
}
