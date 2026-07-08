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
    public DbSet<ContainerSize> ContainerSizesSet => Set<ContainerSize>();
    public DbSet<ContainerType> ContainerTypesSet => Set<ContainerType>();
    public DbSet<ShippingLineDepotContract> ShippingLineDepotContractsSet => Set<ShippingLineDepotContract>();
    public DbSet<PreAdvice> PreAdvicesSet => Set<PreAdvice>();
    public DbSet<PreAdviceDocument> PreAdviceDocumentsSet => Set<PreAdviceDocument>();
    public DbSet<Evaluation> EvaluationsSet => Set<Evaluation>();
    public DbSet<Schedule> SchedulesSet => Set<Schedule>();
    public DbSet<Payment> PaymentsSet => Set<Payment>();
    public DbSet<QRBooking> QRBookingsSet => Set<QRBooking>();
    public DbSet<AuditLog> AuditLogsSet => Set<AuditLog>();
    public DbSet<Notification> NotificationsSet => Set<Notification>();
    public DbSet<DevicePushToken> DevicePushTokensSet => Set<DevicePushToken>();
    public DbSet<RefreshToken> RefreshTokensSet => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokensSet => Set<PasswordResetToken>();
    public DbSet<ManualYardInventoryEntry> ManualYardInventoryEntriesSet => Set<ManualYardInventoryEntry>();
    public DbSet<PaymentSettings> PaymentSettingsSet => Set<PaymentSettings>();
    public DbSet<DemurrageBilling> DemurrageBillingsSet => Set<DemurrageBilling>();
    public DbSet<DemurrageBillingFeeLine> DemurrageBillingFeeLinesSet => Set<DemurrageBillingFeeLine>();
    public DbSet<WithdrawalRequest> WithdrawalRequestsSet => Set<WithdrawalRequest>();
    public DbSet<WithdrawalRequestLine> WithdrawalRequestLinesSet => Set<WithdrawalRequestLine>();
    public DbSet<WithdrawalDocument> WithdrawalDocumentsSet => Set<WithdrawalDocument>();
    public DbSet<WithdrawalSchedule> WithdrawalSchedulesSet => Set<WithdrawalSchedule>();
    public DbSet<CertificateTemplate> CertificateTemplatesSet => Set<CertificateTemplate>();
    public DbSet<CertificateVerification> CertificateVerificationsSet => Set<CertificateVerification>();
    public DbSet<DepotBroadcast> DepotBroadcastsSet => Set<DepotBroadcast>();
    public DbSet<TruckerNews> TruckerNewsSet => Set<TruckerNews>();

    IQueryable<Role> IEcmsDbContext.Roles => RolesSet;
    IQueryable<User> IEcmsDbContext.Users => UsersSet;
    IQueryable<ShippingLine> IEcmsDbContext.ShippingLines => ShippingLinesSet;
    IQueryable<Depot> IEcmsDbContext.Depots => DepotsSet;
    IQueryable<Container> IEcmsDbContext.Containers => ContainersSet;
    IQueryable<ContainerSize> IEcmsDbContext.ContainerSizes => ContainerSizesSet;
    IQueryable<ContainerType> IEcmsDbContext.ContainerTypes => ContainerTypesSet;
    IQueryable<ShippingLineDepotContract> IEcmsDbContext.ShippingLineDepotContracts => ShippingLineDepotContractsSet;
    IQueryable<PreAdvice> IEcmsDbContext.PreAdvices => PreAdvicesSet;
    IQueryable<PreAdviceDocument> IEcmsDbContext.PreAdviceDocuments => PreAdviceDocumentsSet;
    IQueryable<Evaluation> IEcmsDbContext.Evaluations => EvaluationsSet;
    IQueryable<Schedule> IEcmsDbContext.Schedules => SchedulesSet;
    IQueryable<Payment> IEcmsDbContext.Payments => PaymentsSet;
    IQueryable<QRBooking> IEcmsDbContext.QRBookings => QRBookingsSet;
    IQueryable<AuditLog> IEcmsDbContext.AuditLogs => AuditLogsSet;
    IQueryable<Notification> IEcmsDbContext.Notifications => NotificationsSet;
    IQueryable<DevicePushToken> IEcmsDbContext.DevicePushTokens => DevicePushTokensSet;
    IQueryable<RefreshToken> IEcmsDbContext.RefreshTokens => RefreshTokensSet;
    IQueryable<PasswordResetToken> IEcmsDbContext.PasswordResetTokens => PasswordResetTokensSet;
    IQueryable<ManualYardInventoryEntry> IEcmsDbContext.ManualYardInventoryEntries => ManualYardInventoryEntriesSet;
    IQueryable<PaymentSettings> IEcmsDbContext.PaymentSettings => PaymentSettingsSet;
    IQueryable<DemurrageBilling> IEcmsDbContext.DemurrageBillings => DemurrageBillingsSet;
    IQueryable<DemurrageBillingFeeLine> IEcmsDbContext.DemurrageBillingFeeLines => DemurrageBillingFeeLinesSet;
    IQueryable<WithdrawalRequest> IEcmsDbContext.WithdrawalRequests => WithdrawalRequestsSet;
    IQueryable<WithdrawalRequestLine> IEcmsDbContext.WithdrawalRequestLines => WithdrawalRequestLinesSet;
    IQueryable<WithdrawalDocument> IEcmsDbContext.WithdrawalDocuments => WithdrawalDocumentsSet;
    IQueryable<WithdrawalSchedule> IEcmsDbContext.WithdrawalSchedules => WithdrawalSchedulesSet;
    IQueryable<CertificateTemplate> IEcmsDbContext.CertificateTemplates => CertificateTemplatesSet;
    IQueryable<CertificateVerification> IEcmsDbContext.CertificateVerifications => CertificateVerificationsSet;
    IQueryable<DepotBroadcast> IEcmsDbContext.DepotBroadcasts => DepotBroadcastsSet;
    IQueryable<TruckerNews> IEcmsDbContext.TruckerNews => TruckerNewsSet;

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
            e.Property(x => x.ProfilePhoto).HasMaxLength(512);
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

        modelBuilder.Entity<ContainerSize>(e =>
        {
            e.HasIndex(x => x.Label).IsUnique();
        });

        modelBuilder.Entity<ContainerType>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<ShippingLineDepotContract>(e =>
        {
            e.HasIndex(x => new { x.ShippingLineId, x.DepotId }).IsUnique();
            e.HasOne(x => x.ShippingLine).WithMany().HasForeignKey(x => x.ShippingLineId);
            e.HasOne(x => x.Depot).WithMany().HasForeignKey(x => x.DepotId);
        });

        modelBuilder.Entity<ShippingLineDepotContractSizeAllocation>(e =>
        {
            e.HasIndex(x => new { x.ContractId, x.ContainerSizeId }).IsUnique();
            e.HasOne(x => x.Contract)
                .WithMany(x => x.SizeAllocations)
                .HasForeignKey(x => x.ContractId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ContainerSize).WithMany().HasForeignKey(x => x.ContainerSizeId);
        });

        modelBuilder.Entity<PreAdvice>(e =>
        {
            e.HasIndex(x => x.ReferenceNo).IsUnique();
            e.HasIndex(x => x.ActiveRequestKey).IsUnique();
            e.HasIndex(x => new { x.ContainerNoNormalized, x.ContainerSizeId, x.ContainerTypeId });
            e.HasIndex(x => new { x.TruckerId, x.CreatedAt });
            e.HasIndex(x => new { x.ShippingLineId, x.Status });
            e.HasIndex(x => new { x.Status, x.DemurrageValidUntil });
            e.HasOne(x => x.Trucker).WithMany(x => x.PreAdvices).HasForeignKey(x => x.TruckerId);
            e.HasOne(x => x.ShippingLine).WithMany(x => x.PreAdvices).HasForeignKey(x => x.ShippingLineId);
            e.HasOne(x => x.Container).WithMany(x => x.PreAdvices).HasForeignKey(x => x.ContainerId);
            e.HasOne(x => x.ContainerSize).WithMany().HasForeignKey(x => x.ContainerSizeId);
            e.HasOne(x => x.ContainerType).WithMany().HasForeignKey(x => x.ContainerTypeId);
        });

        modelBuilder.Entity<PreAdviceDocument>(e =>
        {
            e.HasIndex(x => new { x.PreAdviceId, x.Category });
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
            e.HasIndex(x => new { x.DepotId, x.Date, x.Status });
            e.HasIndex(x => x.TruckerId);
            e.HasOne(x => x.PreAdvice).WithOne(x => x.Schedule).HasForeignKey<Schedule>(x => x.PreAdviceId);
            e.HasOne(x => x.Depot).WithMany(x => x.Schedules).HasForeignKey(x => x.DepotId);
            e.HasOne(x => x.Trucker).WithMany().HasForeignKey(x => x.TruckerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.HasIndex(x => new { x.Status, x.PaidAt });
            e.Property(x => x.ProofReferenceNo).HasMaxLength(64);
            e.Property(x => x.ProofPaymentId).HasMaxLength(64);
            e.Property(x => x.ProofQrphInvoiceNo).HasMaxLength(32);
            e.Property(x => x.ProofProvider).HasMaxLength(32);
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
            e.HasIndex(x => x.Timestamp);
            e.HasIndex(x => new { x.Module, x.Timestamp });
            e.HasOne(x => x.User).WithMany(x => x.AuditLogs).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.IsRead, x.CreatedAt });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<DevicePushToken>(e =>
        {
            e.HasIndex(x => x.Token).IsUnique();
            e.HasIndex(x => new { x.UserId, x.UpdatedAt });
            e.Property(x => x.Token).HasMaxLength(512);
            e.Property(x => x.Platform).HasMaxLength(32);
            e.Property(x => x.DeviceName).HasMaxLength(128);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
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

        modelBuilder.Entity<ManualYardInventoryEntry>(e =>
        {
            e.HasIndex(x => new { x.ShippingLineId, x.ContainerNo, x.DepotId });
            e.HasOne(x => x.ContainerSize).WithMany().HasForeignKey(x => x.ContainerSizeId);
            e.HasOne(x => x.ContainerType).WithMany().HasForeignKey(x => x.ContainerTypeId);
            e.HasOne(x => x.Depot).WithMany().HasForeignKey(x => x.DepotId);
            e.HasOne(x => x.ShippingLine).WithMany().HasForeignKey(x => x.ShippingLineId);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId);
        });

        modelBuilder.Entity<PaymentSettings>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ReturnFeeAmount).HasPrecision(18, 2);
            e.Property(x => x.DemurrageFeeAmount).HasPrecision(18, 2);
            e.Property(x => x.DetentionFeeAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<DemurrageBilling>(e =>
        {
            e.HasIndex(x => x.ReferenceNo).IsUnique();
            e.HasIndex(x => x.PreAdviceId).IsUnique();
            e.HasIndex(x => new { x.ContainerNoNormalized, x.ShippingLineId, x.ContainerSizeId, x.ContainerTypeId });
            e.Property(x => x.ProofReferenceNo).HasMaxLength(64);
            e.Property(x => x.DemurrageAmount).HasPrecision(18, 2);
            e.Property(x => x.DetentionAmount).HasPrecision(18, 2);
            e.HasOne(x => x.PreAdvice).WithMany().HasForeignKey(x => x.PreAdviceId);
            e.HasOne(x => x.ShippingLine).WithMany().HasForeignKey(x => x.ShippingLineId);
            e.HasOne(x => x.Trucker).WithMany().HasForeignKey(x => x.TruckerId);
            e.HasOne(x => x.ContainerSize).WithMany().HasForeignKey(x => x.ContainerSizeId);
            e.HasOne(x => x.ContainerType).WithMany().HasForeignKey(x => x.ContainerTypeId);
        });

        modelBuilder.Entity<DemurrageBillingFeeLine>(e =>
        {
            e.Property(x => x.Description).HasMaxLength(200);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.DemurrageBilling)
                .WithMany(x => x.FeeLines)
                .HasForeignKey(x => x.DemurrageBillingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WithdrawalRequest>(e =>
        {
            e.HasIndex(x => x.ReferenceNo).IsUnique();
            e.HasIndex(x => new { x.TruckerId, x.CreatedAt });
            e.HasIndex(x => new { x.CurrentDepotId, x.Status });
            e.HasIndex(x => new { x.ShippingLineId, x.Status });
            e.Property(x => x.AtwNumber).HasMaxLength(128);
            e.Property(x => x.Destination).HasMaxLength(512);
            e.Property(x => x.BookingNumber).HasMaxLength(128);
            e.Property(x => x.TruckingCompany).HasMaxLength(256);
            e.Property(x => x.PlateNumber).HasMaxLength(32);
            e.Property(x => x.DriverName).HasMaxLength(256);
            e.HasOne(x => x.Trucker).WithMany().HasForeignKey(x => x.TruckerId);
            e.HasOne(x => x.ShippingLine).WithMany().HasForeignKey(x => x.ShippingLineId);
            e.HasOne(x => x.CurrentDepot).WithMany().HasForeignKey(x => x.CurrentDepotId);
            e.HasOne(x => x.RequestedDepot).WithMany().HasForeignKey(x => x.RequestedDepotId);
            e.HasOne(x => x.AssignedDepot).WithMany().HasForeignKey(x => x.AssignedDepotId);
            e.HasOne(x => x.CyAssignedBy).WithMany().HasForeignKey(x => x.CyAssignedByUserId);
            e.HasOne(x => x.PickupSchedule).WithOne(x => x.WithdrawalRequest).HasForeignKey<WithdrawalSchedule>(x => x.WithdrawalRequestId).HasConstraintName("FK_WSched_WithdrawalRequestId");
        });

        modelBuilder.Entity<WithdrawalSchedule>(e =>
        {
            e.HasIndex(x => x.WithdrawalRequestId).IsUnique().HasDatabaseName("IX_WSched_WithdrawalRequestId");
            e.HasIndex(x => new { x.DepotId, x.Date, x.SlotNo }).HasDatabaseName("IX_WSched_DepotId_Date_SlotNo");
            e.HasOne(x => x.Depot).WithMany().HasForeignKey(x => x.DepotId).HasConstraintName("FK_WSched_DepotId");
            e.HasOne(x => x.Trucker).WithMany().HasForeignKey(x => x.TruckerId).HasConstraintName("FK_WSched_TruckerId");
        });

        modelBuilder.Entity<WithdrawalRequestLine>(e =>
        {
            e.HasIndex(x => x.ActiveRequestKey).IsUnique();
            e.HasIndex(x => new { x.ContainerNoNormalized, x.ContainerSizeId, x.ContainerTypeId });
            e.HasIndex(x => new { x.WithdrawalRequestId, x.LineNo }).IsUnique();
            e.Property(x => x.ContainerNoNormalized).HasMaxLength(255);
            e.Property(x => x.ActiveRequestKey).HasMaxLength(255);
            e.HasOne(x => x.WithdrawalRequest).WithMany(x => x.Lines).HasForeignKey(x => x.WithdrawalRequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Container).WithMany().HasForeignKey(x => x.ContainerId);
            e.HasOne(x => x.ContainerSize).WithMany().HasForeignKey(x => x.ContainerSizeId);
            e.HasOne(x => x.ContainerType).WithMany().HasForeignKey(x => x.ContainerTypeId);
        });

        modelBuilder.Entity<WithdrawalDocument>(e =>
        {
            e.HasIndex(x => new { x.WithdrawalRequestId, x.DocumentType });
            e.Property(x => x.FileName).HasMaxLength(512);
            e.Property(x => x.FilePath).HasMaxLength(512);
            e.Property(x => x.ContentType).HasMaxLength(128);
            e.HasOne(x => x.WithdrawalRequest).WithMany(x => x.Documents).HasForeignKey(x => x.WithdrawalRequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.UploadedBy).WithMany().HasForeignKey(x => x.UploadedById);
        });

        modelBuilder.Entity<CertificateTemplate>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(256);
            e.HasIndex(x => new { x.ShippingLineId, x.DocumentType, x.IsActive });
            e.HasOne(x => x.ShippingLine).WithMany().HasForeignKey(x => x.ShippingLineId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CertificateVerification>(e =>
        {
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.WithdrawalDocumentId);
            e.HasIndex(x => new { x.WithdrawalRequestId, x.RevokedAtUtc });
            e.Property(x => x.TokenHash).HasMaxLength(64);
            e.Property(x => x.DocumentFingerprint).HasMaxLength(64);
            e.Property(x => x.AtwNumber).HasMaxLength(64);
            e.Property(x => x.ReferenceNo).HasMaxLength(64);
            e.Property(x => x.ShippingLineName).HasMaxLength(256);
            e.Property(x => x.TruckerName).HasMaxLength(256);
            e.Property(x => x.DepotName).HasMaxLength(256);
            e.Property(x => x.ContainerNo).HasMaxLength(64);
            e.Property(x => x.ContainerSize).HasMaxLength(32);
            e.Property(x => x.ContainerType).HasMaxLength(32);
            e.Property(x => x.Destination).HasMaxLength(256);
            e.Property(x => x.RevocationReason).HasMaxLength(512);
            e.HasOne(x => x.WithdrawalRequest).WithMany().HasForeignKey(x => x.WithdrawalRequestId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("FK_CertVerif_WithdrawalRequestId");
            e.HasOne(x => x.WithdrawalDocument).WithMany().HasForeignKey(x => x.WithdrawalDocumentId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("FK_CertVerif_WithdrawalDocumentId");
        });

        modelBuilder.Entity<DepotBroadcast>(e =>
        {
            e.HasIndex(x => new { x.DepotId, x.CreatedAt });
            e.Property(x => x.Subject).HasMaxLength(128);
            e.Property(x => x.Message).HasMaxLength(4000);
            e.HasOne(x => x.Depot).WithMany().HasForeignKey(x => x.DepotId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TruckerNews>(e =>
        {
            e.HasIndex(x => new { x.IsPublished, x.PublishedAt });
            e.Property(x => x.Title).HasMaxLength(128);
            e.Property(x => x.Body).HasMaxLength(4000);
            e.Property(x => x.ImagePath).HasMaxLength(512);
            e.Property(x => x.ImageFileName).HasMaxLength(256);
            e.Property(x => x.ImageContentType).HasMaxLength(128);
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
