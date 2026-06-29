using ECMS.Domain.Entities;

namespace ECMS.Application.Interfaces;

public interface IEcmsDbContext
{
    IQueryable<Role> Roles { get; }
    IQueryable<User> Users { get; }
    IQueryable<ShippingLine> ShippingLines { get; }
    IQueryable<Depot> Depots { get; }
    IQueryable<Container> Containers { get; }
    IQueryable<ContainerSize> ContainerSizes { get; }
    IQueryable<ContainerType> ContainerTypes { get; }
    IQueryable<ShippingLineDepotContract> ShippingLineDepotContracts { get; }
    IQueryable<PreAdvice> PreAdvices { get; }
    IQueryable<PreAdviceDocument> PreAdviceDocuments { get; }
    IQueryable<Evaluation> Evaluations { get; }
    IQueryable<Schedule> Schedules { get; }
    IQueryable<Payment> Payments { get; }
    IQueryable<QRBooking> QRBookings { get; }
    IQueryable<AuditLog> AuditLogs { get; }
    IQueryable<Notification> Notifications { get; }
    IQueryable<RefreshToken> RefreshTokens { get; }
    IQueryable<PasswordResetToken> PasswordResetTokens { get; }
    IQueryable<ManualYardInventoryEntry> ManualYardInventoryEntries { get; }
    IQueryable<PaymentSettings> PaymentSettings { get; }
    IQueryable<DemurrageBilling> DemurrageBillings { get; }
    IQueryable<DemurrageBillingFeeLine> DemurrageBillingFeeLines { get; }
    IQueryable<WithdrawalRequest> WithdrawalRequests { get; }
    IQueryable<WithdrawalRequestLine> WithdrawalRequestLines { get; }
    IQueryable<WithdrawalDocument> WithdrawalDocuments { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    void Add<T>(T entity) where T : class;
    void Update<T>(T entity) where T : class;
    void Remove<T>(T entity) where T : class;
}
