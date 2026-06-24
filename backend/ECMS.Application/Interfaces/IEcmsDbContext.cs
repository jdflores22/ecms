using ECMS.Domain.Entities;

namespace ECMS.Application.Interfaces;

public interface IEcmsDbContext
{
    IQueryable<Role> Roles { get; }
    IQueryable<User> Users { get; }
    IQueryable<ShippingLine> ShippingLines { get; }
    IQueryable<Depot> Depots { get; }
    IQueryable<Container> Containers { get; }
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

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    void Add<T>(T entity) where T : class;
    void Update<T>(T entity) where T : class;
    void Remove<T>(T entity) where T : class;
}
