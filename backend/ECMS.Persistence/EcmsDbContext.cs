using ECMS.Application.Interfaces;
using ECMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ECMS.Persistence;

public class EcmsDbContext : DbContext, IEcmsDbContext
{
    public EcmsDbContext(DbContextOptions<EcmsDbContext> options) : base(options) { }

    public DbSet<Role> RolesSet => Set<Role>();
    public DbSet<User> UsersSet => Set<User>();
    public DbSet<ShippingLine> ShippingLinesSet => Set<ShippingLine>();
    public DbSet<Depot> DepotsSet => Set<Depot>();
    public DbSet<Container> ContainersSet => Set<Container>();
    public DbSet<PreAdvice> PreAdvicesSet => Set<PreAdvice>();
    public DbSet<PreAdviceDocument> PreAdviceDocumentsSet => Set<PreAdviceDocument>();
    public DbSet<Evaluation> EvaluationsSet => Set<Evaluation>();
    public DbSet<Schedule> SchedulesSet => Set<Schedule>();
    public DbSet<Payment> PaymentsSet => Set<Payment>();
    public DbSet<QRBooking> QRBookingsSet => Set<QRBooking>();
    public DbSet<AuditLog> AuditLogsSet => Set<AuditLog>();
    public DbSet<Notification> NotificationsSet => Set<Notification>();
    public DbSet<RefreshToken> RefreshTokensSet => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokensSet => Set<PasswordResetToken>();

    IQueryable<Role> IEcmsDbContext.Roles => RolesSet;
    IQueryable<User> IEcmsDbContext.Users => UsersSet;
    IQueryable<ShippingLine> IEcmsDbContext.ShippingLines => ShippingLinesSet;
    IQueryable<Depot> IEcmsDbContext.Depots => DepotsSet;
    IQueryable<Container> IEcmsDbContext.Containers => ContainersSet;
    IQueryable<PreAdvice> IEcmsDbContext.PreAdvices => PreAdvicesSet;
    IQueryable<PreAdviceDocument> IEcmsDbContext.PreAdviceDocuments => PreAdviceDocumentsSet;
    IQueryable<Evaluation> IEcmsDbContext.Evaluations => EvaluationsSet;
    IQueryable<Schedule> IEcmsDbContext.Schedules => SchedulesSet;
    IQueryable<Payment> IEcmsDbContext.Payments => PaymentsSet;
    IQueryable<QRBooking> IEcmsDbContext.QRBookings => QRBookingsSet;
    IQueryable<AuditLog> IEcmsDbContext.AuditLogs => AuditLogsSet;
    IQueryable<Notification> IEcmsDbContext.Notifications => NotificationsSet;
    IQueryable<RefreshToken> IEcmsDbContext.RefreshTokens => RefreshTokensSet;
    IQueryable<PasswordResetToken> IEcmsDbContext.PasswordResetTokens => PasswordResetTokensSet;

    void IEcmsDbContext.Add<T>(T entity) => Add(entity);
    void IEcmsDbContext.Update<T>(T entity) => Update(entity);
    void IEcmsDbContext.Remove<T>(T entity) => Remove(entity);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasOne(x => x.Role).WithMany(x => x.Users).HasForeignKey(x => x.RoleId);
            e.HasOne(x => x.ShippingLine).WithMany(x => x.Users).HasForeignKey(x => x.ShippingLineId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Depot).WithMany(x => x.Users).HasForeignKey(x => x.DepotId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ShippingLine>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<Container>(e =>
        {
            e.HasIndex(x => x.ContainerNo).IsUnique();
            e.HasOne(x => x.ShippingLine).WithMany(x => x.Containers).HasForeignKey(x => x.ShippingLineId);
        });

        modelBuilder.Entity<PreAdvice>(e =>
        {
            e.HasIndex(x => x.ReferenceNo).IsUnique();
            e.HasOne(x => x.Broker).WithMany(x => x.PreAdvices).HasForeignKey(x => x.BrokerId);
            e.HasOne(x => x.ShippingLine).WithMany(x => x.PreAdvices).HasForeignKey(x => x.ShippingLineId);
            e.HasOne(x => x.Container).WithMany(x => x.PreAdvices).HasForeignKey(x => x.ContainerId);
        });

        modelBuilder.Entity<PreAdviceDocument>(e =>
        {
            e.HasOne(x => x.PreAdvice).WithMany(x => x.Documents).HasForeignKey(x => x.PreAdviceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.UploadedBy).WithMany().HasForeignKey(x => x.UploadedById);
        });

        modelBuilder.Entity<Evaluation>(e =>
        {
            e.HasOne(x => x.PreAdvice).WithOne(x => x.Evaluation).HasForeignKey<Evaluation>(x => x.PreAdviceId);
            e.HasOne(x => x.Evaluator).WithMany(x => x.Evaluations).HasForeignKey(x => x.EvaluatorId);
            e.HasOne(x => x.Depot).WithMany(x => x.Evaluations).HasForeignKey(x => x.DepotId);
        });

        modelBuilder.Entity<Schedule>(e =>
        {
            e.HasOne(x => x.PreAdvice).WithOne(x => x.Schedule).HasForeignKey<Schedule>(x => x.PreAdviceId);
            e.HasOne(x => x.Depot).WithMany(x => x.Schedules).HasForeignKey(x => x.DepotId);
            e.HasOne(x => x.Trucker).WithMany().HasForeignKey(x => x.TruckerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.HasOne(x => x.Schedule).WithOne(x => x.Payment).HasForeignKey<Payment>(x => x.ScheduleId);
            e.HasOne(x => x.Trucker).WithMany(x => x.Payments).HasForeignKey(x => x.TruckerId);
        });

        modelBuilder.Entity<QRBooking>(e =>
        {
            e.HasIndex(x => x.QRCode).IsUnique();
            e.HasOne(x => x.Schedule).WithOne(x => x.QRBooking).HasForeignKey<QRBooking>(x => x.ScheduleId);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasOne(x => x.User).WithMany(x => x.AuditLogs).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.IsRead, x.CreatedAt });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.User).WithMany(x => x.PasswordResetTokens).HasForeignKey(x => x.UserId);
        });
    }
}
