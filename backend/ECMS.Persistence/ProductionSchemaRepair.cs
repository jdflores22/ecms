using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ECMS.Persistence;

/// <summary>
/// Idempotent column repairs for production when EF history and schema drift.
/// </summary>
public static class ProductionSchemaRepair
{
    public static async Task ApplyAsync(EcmsDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        await EnsureColumnAsync(
            db,
            logger,
            table: "PaymentsSet",
            column: "ProofProvider",
            definition: "varchar(32) CHARACTER SET utf8mb4 NULL",
            migrationId: "20260701120000_AddPaymentProofProvider",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "PaymentsSet",
            column: "ProofQrphInvoiceNo",
            definition: "varchar(32) CHARACTER SET utf8mb4 NULL",
            migrationId: "20260701140000_AddPaymentProofQrphInvoiceNo",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "SchedulesSet",
            column: "DepotRemarks",
            definition: "longtext CHARACTER SET utf8mb4 NULL",
            migrationId: "20260701160000_AddScheduleDepotRemarks",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "PaymentsSet",
            column: "ProofPaymentId",
            definition: "varchar(64) CHARACTER SET utf8mb4 NULL",
            migrationId: "20260703150000_AddPaymentProofPaymentId",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "QRBookingsSet",
            column: "ConfirmationPdfPath",
            definition: "longtext CHARACTER SET utf8mb4 NULL",
            migrationId: "20260728120000_AddQrBookingConfirmationPdfPath",
            cancellationToken);

        await EnsureWithdrawalBookingFlowAsync(db, logger, cancellationToken);

        await EnsureDevicePushTokensTableAsync(db, logger, cancellationToken);

        await EnsureCertificateTemplatesTableAsync(db, logger, cancellationToken);

        await EnsureCertificateVerificationsTableAsync(db, logger, cancellationToken);

        await EnsureDepotBroadcastsTableAsync(db, logger, cancellationToken);

        await EnsureTruckerNewsTableAsync(db, logger, cancellationToken);

        await EnsureYardInventoryReleaseStatusAsync(db, logger, cancellationToken);

        await EnsureContainerReleaseOrdersAsync(db, logger, cancellationToken);

        await EnsurePreAdviceCroLinkAsync(db, logger, cancellationToken);

        await EnsureDemurrageDetentionRatesAsync(db, logger, cancellationToken);

        await EnsureStatementOfAccountsAsync(db, logger, cancellationToken);

        await EnsureSoaTruckerRegistrationsAsync(db, logger, cancellationToken);
    }

    private static async Task EnsurePreAdviceCroLinkAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (!await TableExistsAsync(db, "PreAdvicesSet", cancellationToken))
            return;

        await EnsureColumnAsync(
            db,
            logger,
            "PreAdvicesSet",
            "CroEdoReferenceNo",
            "varchar(32) CHARACTER SET utf8mb4 NULL",
            "20260804150000_AddPreAdviceCroLink",
            cancellationToken);
        await EnsureColumnAsync(
            db,
            logger,
            "PreAdvicesSet",
            "CroEdoVerificationTokenHash",
            "varchar(64) CHARACTER SET utf8mb4 NULL",
            "20260804150000_AddPreAdviceCroLink",
            cancellationToken);
        await EnsureColumnAsync(
            db,
            logger,
            "PreAdvicesSet",
            "ContainerReleaseOrderId",
            "int NULL",
            "20260804150000_AddPreAdviceCroLink",
            cancellationToken);

        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE INDEX `IX_PreAdvicesSet_CroEdoVerificationTokenHash`
                ON `PreAdvicesSet` (`CroEdoVerificationTokenHash`)
                """,
                cancellationToken);
        }
        catch { /* may already exist */ }

        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE INDEX `IX_PreAdvicesSet_ContainerReleaseOrderId`
                ON `PreAdvicesSet` (`ContainerReleaseOrderId`)
                """,
                cancellationToken);
        }
        catch { /* may already exist */ }

        if (await TableExistsAsync(db, "ContainerReleaseOrdersSet", cancellationToken))
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    ALTER TABLE `PreAdvicesSet`
                    ADD CONSTRAINT `FK_PreAdvicesSet_ContainerReleaseOrderId`
                    FOREIGN KEY (`ContainerReleaseOrderId`) REFERENCES `ContainerReleaseOrdersSet` (`Id`)
                    ON DELETE SET NULL
                    """,
                    cancellationToken);
            }
            catch { /* may already exist */ }
        }
    }

    private static async Task EnsureWithdrawalBookingFlowAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "BookingNumber", "varchar(128) CHARACTER SET utf8mb4 NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "TruckingCompany", "varchar(256) CHARACTER SET utf8mb4 NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "PlateNumber", "varchar(32) CHARACTER SET utf8mb4 NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "DriverName", "varchar(256) CHARACTER SET utf8mb4 NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "RequestedDepotId", "int NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "AssignedDepotId", "int NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "BookedAt", "datetime(6) NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "CyAssignedAt", "datetime(6) NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);
        await EnsureColumnAsync(db, logger, "WithdrawalRequestsSet", "CyAssignedByUserId", "int NULL", "20260705120000_AddWithdrawalBookingFlow", cancellationToken);

        if (await TableExistsAsync(db, "WithdrawalSchedulesSet", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('20260705120000_AddWithdrawalBookingFlow', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table WithdrawalSchedulesSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `WithdrawalSchedulesSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `WithdrawalRequestId` int NOT NULL,
                `DepotId` int NOT NULL,
                `Date` date NOT NULL,
                `Time` time(6) NOT NULL,
                `SlotNo` int NOT NULL,
                `Status` int NOT NULL,
                `TruckerId` int NULL,
                `DepotRemarks` longtext CHARACTER SET utf8mb4 NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `IX_WSched_WithdrawalRequestId` (`WithdrawalRequestId`),
                KEY `IX_WSched_DepotId_Date_SlotNo` (`DepotId`, `Date`, `SlotNo`),
                KEY `IX_WSched_TruckerId` (`TruckerId`),
                CONSTRAINT `FK_WSched_DepotId`
                    FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_WSched_TruckerId`
                    FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`),
                CONSTRAINT `FK_WSched_WithdrawalRequestId`
                    FOREIGN KEY (`WithdrawalRequestId`) REFERENCES `WithdrawalRequestsSet` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('20260705120000_AddWithdrawalBookingFlow', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureDevicePushTokensTableAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "DevicePushTokensSet", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('20260702150000_AddDevicePushTokens', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table DevicePushTokensSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `DevicePushTokensSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `UserId` int NOT NULL,
                `Token` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
                `Platform` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                `DeviceName` varchar(128) CHARACTER SET utf8mb4 NULL,
                `UpdatedAt` datetime(6) NOT NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `IX_DevicePushTokensSet_Token` (`Token`),
                KEY `IX_DevicePushTokensSet_UserId_UpdatedAt` (`UserId`, `UpdatedAt`),
                CONSTRAINT `FK_DevicePushTokensSet_UsersSet_UserId`
                    FOREIGN KEY (`UserId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('20260702150000_AddDevicePushTokens', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureCertificateTemplatesTableAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "CertificateTemplatesSet", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('20260706120000_AddCertificateTemplates', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table CertificateTemplatesSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `CertificateTemplatesSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `ShippingLineId` int NOT NULL,
                `DocumentType` int NOT NULL,
                `Name` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
                `LayoutJson` longtext CHARACTER SET utf8mb4 NOT NULL,
                `IsActive` tinyint(1) NOT NULL,
                `UpdatedAt` datetime(6) NOT NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                KEY `IX_CertificateTemplates_ShippingLineId_DocumentType_IsActive` (`ShippingLineId`, `DocumentType`, `IsActive`),
                CONSTRAINT `FK_CertificateTemplatesSet_ShippingLinesSet_ShippingLineId`
                    FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('20260706120000_AddCertificateTemplates', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureCertificateVerificationsTableAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "CertificateVerificationsSet", cancellationToken))
        {
            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "TruckerName",
                "varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT ''",
                "20260707020000_AddCertificateVerificationTruckerName",
                cancellationToken);

            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "DepotName",
                "varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT ''",
                "20260707023000_AddCertificateVerificationDepotName",
                cancellationToken);

            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "ContainerNo",
                "varchar(64) CHARACTER SET utf8mb4 NOT NULL DEFAULT ''",
                "20260707030000_AddCertificateVerificationContainerFields",
                cancellationToken);

            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "ContainerSize",
                "varchar(32) CHARACTER SET utf8mb4 NOT NULL DEFAULT ''",
                "20260707030000_AddCertificateVerificationContainerFields",
                cancellationToken);

            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "ContainerType",
                "varchar(32) CHARACTER SET utf8mb4 NOT NULL DEFAULT ''",
                "20260707030000_AddCertificateVerificationContainerFields",
                cancellationToken);

            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "Destination",
                "varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT ''",
                "20260707030000_AddCertificateVerificationContainerFields",
                cancellationToken);

            await EnsureColumnAsync(
                db,
                logger,
                "CertificateVerificationsSet",
                "WithdrawalRequestLineId",
                "int NULL",
                "20260707030000_AddCertificateVerificationContainerFields",
                cancellationToken);

            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('20260706180000_AddCertificateVerifications', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table CertificateVerificationsSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `CertificateVerificationsSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `TokenHash` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
                `WithdrawalRequestId` int NOT NULL,
                `WithdrawalDocumentId` int NOT NULL,
                `DocumentType` int NOT NULL,
                `DocumentFingerprint` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
                `AtwNumber` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
                `ReferenceNo` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
                `ShippingLineName` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
                `TruckerName` varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
                `DepotName` varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
                `ContainerNo` varchar(64) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
                `ContainerSize` varchar(32) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
                `ContainerType` varchar(32) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
                `Destination` varchar(256) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
                `WithdrawalRequestLineId` int NULL,
                `IssuedAtUtc` datetime(6) NOT NULL,
                `RevokedAtUtc` datetime(6) NULL,
                `RevocationReason` varchar(512) CHARACTER SET utf8mb4 NULL,
                `VerificationCount` int NOT NULL DEFAULT 0,
                `LastVerifiedAtUtc` datetime(6) NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `IX_CertificateVerificationsSet_TokenHash` (`TokenHash`),
                KEY `IX_CertificateVerificationsSet_WithdrawalDocumentId` (`WithdrawalDocumentId`),
                KEY `IX_CertificateVerificationsSet_WithdrawalRequestId_RevokedAtUtc` (`WithdrawalRequestId`, `RevokedAtUtc`),
                CONSTRAINT `FK_CertVerif_WithdrawalDocumentId`
                    FOREIGN KEY (`WithdrawalDocumentId`) REFERENCES `WithdrawalDocumentsSet` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_CertVerif_WithdrawalRequestId`
                    FOREIGN KEY (`WithdrawalRequestId`) REFERENCES `WithdrawalRequestsSet` (`Id`) ON DELETE CASCADE
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('20260706180000_AddCertificateVerifications', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureDepotBroadcastsTableAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "DepotBroadcastsSet", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('20260707040000_AddDepotBroadcasts', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table DepotBroadcastsSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `DepotBroadcastsSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `DepotId` int NOT NULL,
                `Subject` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
                `Message` varchar(4000) CHARACTER SET utf8mb4 NOT NULL,
                `CreatedByUserId` int NOT NULL,
                `RecipientCount` int NOT NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                KEY `IX_DepotBroadcastsSet_DepotId_CreatedAt` (`DepotId`, `CreatedAt`),
                CONSTRAINT `FK_DepotBroadcasts_DepotId`
                    FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_DepotBroadcasts_CreatedByUserId`
                    FOREIGN KEY (`CreatedByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('20260707040000_AddDepotBroadcasts', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureTruckerNewsTableAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await TableExistsAsync(db, "TruckerNewsSet", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('20260708143000_AddTruckerNews', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table TruckerNewsSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `TruckerNewsSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `Title` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
                `Body` varchar(4000) CHARACTER SET utf8mb4 NOT NULL,
                `ImagePath` varchar(512) CHARACTER SET utf8mb4 NULL,
                `ImageFileName` varchar(256) CHARACTER SET utf8mb4 NULL,
                `ImageContentType` varchar(128) CHARACTER SET utf8mb4 NULL,
                `ImageFileSize` bigint NULL,
                `IsPublished` tinyint(1) NOT NULL,
                `PublishedAt` datetime(6) NULL,
                `CreatedByUserId` int NOT NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                KEY `IX_TruckerNewsSet_IsPublished_PublishedAt` (`IsPublished`, `PublishedAt`),
                CONSTRAINT `FK_TruckerNews_CreatedByUserId`
                    FOREIGN KEY (`CreatedByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('20260708143000_AddTruckerNews', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureYardInventoryReleaseStatusAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await EnsureColumnAsync(
            db,
            logger,
            table: "ManualYardInventoryEntriesSet",
            column: "YardStatus",
            definition: "int NOT NULL DEFAULT 0",
            migrationId: "20260706153000_AddYardInventoryReleaseStatus",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "ManualYardInventoryEntriesSet",
            column: "ReleasedAt",
            definition: "datetime(6) NULL",
            migrationId: "20260706153000_AddYardInventoryReleaseStatus",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "ManualYardInventoryEntriesSet",
            column: "ReleasedWithdrawalRequestId",
            definition: "int NULL",
            migrationId: "20260706153000_AddYardInventoryReleaseStatus",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "ManualYardInventoryEntriesSet",
            column: "ReleasedWithdrawalLineId",
            definition: "int NULL",
            migrationId: "20260706153000_AddYardInventoryReleaseStatus",
            cancellationToken);

        await EnsureColumnAsync(
            db,
            logger,
            table: "WithdrawalRequestLinesSet",
            column: "ReleasedAt",
            definition: "datetime(6) NULL",
            migrationId: "20260706153000_AddYardInventoryReleaseStatus",
            cancellationToken);
    }

    private static async Task EnsureContainerReleaseOrdersAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260804120000_AddContainerReleaseOrders";

        if (await TableExistsAsync(db, "ContainerReleaseOrdersSet", cancellationToken))
        {
            await EnsureColumnAsync(
                db,
                logger,
                "ContainerReleaseOrdersSet",
                "VerificationTokenHash",
                "varchar(64) CHARACTER SET utf8mb4 NULL",
                "20260804140000_AddCroVerificationToken",
                cancellationToken);
            await EnsureColumnAsync(
                db,
                logger,
                "ContainerReleaseOrdersSet",
                "VerificationCount",
                "int NOT NULL DEFAULT 0",
                "20260804140000_AddCroVerificationToken",
                cancellationToken);
            await EnsureColumnAsync(
                db,
                logger,
                "ContainerReleaseOrdersSet",
                "LastVerifiedAt",
                "datetime(6) NULL",
                "20260804140000_AddCroVerificationToken",
                cancellationToken);

            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    CREATE UNIQUE INDEX `IX_CRO_VerificationTokenHash`
                    ON `ContainerReleaseOrdersSet` (`VerificationTokenHash`)
                    """,
                    cancellationToken);
            }
            catch
            {
                /* index may already exist */
            }

            await db.Database.ExecuteSqlRawAsync(
                $"""
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('{migrationId}', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing tables ContainerReleaseOrdersSet / ContainerReleaseOrderLinesSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `ContainerReleaseOrdersSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `ReferenceNo` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                `ShippingLineId` int NOT NULL,
                `Status` int NOT NULL,
                `ConsigneeNotifyParty` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
                `ShippingLineCarrier` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
                `RegistryNumber` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
                `CustomsOffice` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
                `VesselVoyageNumber` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
                `BlNumber` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
                `BrokerName` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
                `PortInstructions` longtext CHARACTER SET utf8mb4 NOT NULL,
                `EmptyReturnNote` longtext CHARACTER SET utf8mb4 NOT NULL,
                `AuthorizedByName` varchar(256) CHARACTER SET utf8mb4 NULL,
                `AuthorizedByCompany` varchar(256) CHARACTER SET utf8mb4 NULL,
                `PreparedByName` varchar(256) CHARACTER SET utf8mb4 NULL,
                `Remarks` longtext CHARACTER SET utf8mb4 NULL,
                `IssuedAt` datetime(6) NULL,
                `IssuedByUserId` int NULL,
                `PdfPath` varchar(512) CHARACTER SET utf8mb4 NULL,
                `VerificationTokenHash` varchar(64) CHARACTER SET utf8mb4 NULL,
                `VerificationCount` int NOT NULL DEFAULT 0,
                `LastVerifiedAt` datetime(6) NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `IX_CRO_ReferenceNo` (`ReferenceNo`),
                UNIQUE KEY `IX_CRO_VerificationTokenHash` (`VerificationTokenHash`),
                KEY `IX_CRO_ShippingLineId_Status_CreatedAt` (`ShippingLineId`, `Status`, `CreatedAt`),
                KEY `IX_CRO_BlNumber` (`BlNumber`),
                KEY `IX_CRO_IssuedByUserId` (`IssuedByUserId`),
                CONSTRAINT `FK_CRO_ShippingLineId`
                    FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE RESTRICT,
                CONSTRAINT `FK_CRO_IssuedByUserId`
                    FOREIGN KEY (`IssuedByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE SET NULL
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `ContainerReleaseOrderLinesSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `ContainerReleaseOrderId` int NOT NULL,
                `LineNo` int NOT NULL,
                `ContainerNumber` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
                `Size` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                `Type` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                `Seal` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
                `HaulerName` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
                `PlateNo` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                `LineReferenceNo` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                `DemurrageValidUntil` date NOT NULL,
                `ReturnEmptyToDepotId` int NULL,
                `ReturnEmptyToName` varchar(256) CHARACTER SET utf8mb4 NOT NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `IX_CROLine_OrderId_LineNo` (`ContainerReleaseOrderId`, `LineNo`),
                KEY `IX_CROLine_ContainerNumber` (`ContainerNumber`),
                KEY `IX_CROLine_ReturnEmptyToDepotId` (`ReturnEmptyToDepotId`),
                CONSTRAINT `FK_CROLine_OrderId`
                    FOREIGN KEY (`ContainerReleaseOrderId`) REFERENCES `ContainerReleaseOrdersSet` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_CROLine_ReturnEmptyToDepotId`
                    FOREIGN KEY (`ReturnEmptyToDepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE SET NULL
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            $"""
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('{migrationId}', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureDemurrageDetentionRatesAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260903020000_AddDemurrageDetentionRates";

        if (!await TableExistsAsync(db, "DemurrageDetentionRatesSet", cancellationToken))
        {
            logger.LogWarning("Creating missing table DemurrageDetentionRatesSet");
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `DemurrageDetentionRatesSet` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `ShippingLineId` int NOT NULL,
                    `DepotId` int NULL,
                    `ContainerSizeId` int NULL,
                    `DemurrageAmount` decimal(18,2) NOT NULL,
                    `DetentionAmount` decimal(18,2) NOT NULL,
                    `EffectiveFrom` date NOT NULL,
                    `EffectiveTo` date NULL,
                    `IsActive` tinyint(1) NOT NULL,
                    `UpdatedAt` datetime(6) NOT NULL,
                    `CreatedAt` datetime(6) NOT NULL,
                    PRIMARY KEY (`Id`),
                    KEY `IX_DemurrageDetentionRates_Line_Depot_Size_Active_From`
                        (`ShippingLineId`, `DepotId`, `ContainerSizeId`, `IsActive`, `EffectiveFrom`),
                    KEY `IX_DemurrageDetentionRates_DepotId` (`DepotId`),
                    KEY `IX_DemurrageDetentionRates_ContainerSizeId` (`ContainerSizeId`),
                    CONSTRAINT `FK_DemurrageDetentionRates_ShippingLines`
                        FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE,
                    CONSTRAINT `FK_DemurrageDetentionRates_Depots`
                        FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE RESTRICT,
                    CONSTRAINT `FK_DemurrageDetentionRates_ContainerSizes`
                        FOREIGN KEY (`ContainerSizeId`) REFERENCES `ContainerSizesSet` (`Id`) ON DELETE RESTRICT
                ) CHARACTER SET=utf8mb4
                """,
                cancellationToken);
        }

        if (await TableExistsAsync(db, "DemurrageBillingsSet", cancellationToken))
        {
            await EnsureColumnAsync(
                db,
                logger,
                "DemurrageBillingsSet",
                "AppliedRateId",
                "int NULL",
                migrationId,
                cancellationToken);
            await EnsureColumnAsync(
                db,
                logger,
                "DemurrageBillingsSet",
                "AppliedRateLabel",
                "varchar(256) CHARACTER SET utf8mb4 NULL",
                migrationId,
                cancellationToken);

            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    CREATE INDEX `IX_DemurrageBillings_AppliedRateId`
                    ON `DemurrageBillingsSet` (`AppliedRateId`)
                    """,
                    cancellationToken);
            }
            catch
            {
                /* index may already exist */
            }

            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    ALTER TABLE `DemurrageBillingsSet`
                    ADD CONSTRAINT `FK_DemurrageBillings_AppliedRate`
                    FOREIGN KEY (`AppliedRateId`) REFERENCES `DemurrageDetentionRatesSet` (`Id`)
                    ON DELETE SET NULL
                    """,
                    cancellationToken);
            }
            catch
            {
                /* constraint may already exist */
            }
        }

        await db.Database.ExecuteSqlRawAsync(
            $"""
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('{migrationId}', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureStatementOfAccountsAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260904140000_AddStatementOfAccounts";

        if (await TableExistsAsync(db, "DemurrageBillingsSet", cancellationToken))
        {
            await EnsureColumnAsync(
                db,
                logger,
                "DemurrageBillingsSet",
                "StatementOfAccountId",
                "int NULL",
                migrationId,
                cancellationToken);
        }

        if (!await TableExistsAsync(db, "ShippingLineCreditLinesSet", cancellationToken))
        {
            logger.LogWarning("Creating missing table ShippingLineCreditLinesSet");
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `ShippingLineCreditLinesSet` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `ShippingLineId` int NOT NULL,
                    `CreditLimit` decimal(18,2) NOT NULL,
                    `UtilizedAmount` decimal(18,2) NOT NULL,
                    `IsActive` tinyint(1) NOT NULL,
                    `UpdatedAt` datetime(6) NOT NULL,
                    `CreatedAt` datetime(6) NOT NULL,
                    PRIMARY KEY (`Id`),
                    UNIQUE KEY `IX_ShippingLineCreditLinesSet_ShippingLineId` (`ShippingLineId`),
                    CONSTRAINT `FK_ShippingLineCreditLines_ShippingLines`
                        FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE
                ) CHARACTER SET=utf8mb4
                """,
                cancellationToken);
        }

        if (!await TableExistsAsync(db, "StatementOfAccountsSet", cancellationToken))
        {
            logger.LogWarning("Creating missing table StatementOfAccountsSet");
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `StatementOfAccountsSet` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `ReferenceNo` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
                    `ShippingLineId` int NOT NULL,
                    `TruckerId` int NOT NULL,
                    `PeriodFrom` date NULL,
                    `PeriodTo` date NULL,
                    `Status` int NOT NULL,
                    `TotalAmount` decimal(18,2) NOT NULL,
                    `CreditApplied` decimal(18,2) NOT NULL,
                    `AmountDue` decimal(18,2) NOT NULL,
                    `DueDate` date NULL,
                    `IssuedAt` datetime(6) NULL,
                    `PaidAt` datetime(6) NULL,
                    `IssuedByUserId` int NULL,
                    `Remarks` varchar(1000) CHARACTER SET utf8mb4 NULL,
                    `ProofFile` longtext CHARACTER SET utf8mb4 NULL,
                    `ProofReferenceNo` varchar(64) CHARACTER SET utf8mb4 NULL,
                    `ProofTransactionAt` datetime(6) NULL,
                    `CreatedAt` datetime(6) NOT NULL,
                    PRIMARY KEY (`Id`),
                    UNIQUE KEY `IX_StatementOfAccountsSet_ReferenceNo` (`ReferenceNo`),
                    KEY `IX_StatementOfAccountsSet_ShippingLineId_TruckerId_Status`
                        (`ShippingLineId`, `TruckerId`, `Status`),
                    KEY `IX_StatementOfAccountsSet_IssuedByUserId` (`IssuedByUserId`),
                    CONSTRAINT `FK_StatementOfAccounts_ShippingLines`
                        FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE RESTRICT,
                    CONSTRAINT `FK_StatementOfAccounts_Truckers`
                        FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT,
                    CONSTRAINT `FK_StatementOfAccounts_IssuedBy`
                        FOREIGN KEY (`IssuedByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE SET NULL
                ) CHARACTER SET=utf8mb4
                """,
                cancellationToken);
        }

        if (!await TableExistsAsync(db, "StatementOfAccountLinesSet", cancellationToken))
        {
            logger.LogWarning("Creating missing table StatementOfAccountLinesSet");
            await db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE `StatementOfAccountLinesSet` (
                    `Id` int NOT NULL AUTO_INCREMENT,
                    `StatementOfAccountId` int NOT NULL,
                    `DemurrageBillingId` int NOT NULL,
                    `Description` varchar(300) CHARACTER SET utf8mb4 NOT NULL,
                    `Amount` decimal(18,2) NOT NULL,
                    `SortOrder` int NOT NULL,
                    `CreatedAt` datetime(6) NOT NULL,
                    PRIMARY KEY (`Id`),
                    UNIQUE KEY `IX_StatementOfAccountLinesSet_DemurrageBillingId` (`DemurrageBillingId`),
                    KEY `IX_StatementOfAccountLinesSet_StatementOfAccountId` (`StatementOfAccountId`),
                    CONSTRAINT `FK_StatementOfAccountLines_SOA`
                        FOREIGN KEY (`StatementOfAccountId`) REFERENCES `StatementOfAccountsSet` (`Id`) ON DELETE CASCADE,
                    CONSTRAINT `FK_StatementOfAccountLines_DemurrageBilling`
                        FOREIGN KEY (`DemurrageBillingId`) REFERENCES `DemurrageBillingsSet` (`Id`) ON DELETE RESTRICT
                ) CHARACTER SET=utf8mb4
                """,
                cancellationToken);
        }

        if (await TableExistsAsync(db, "DemurrageBillingsSet", cancellationToken)
            && await TableExistsAsync(db, "StatementOfAccountsSet", cancellationToken))
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    CREATE INDEX `IX_DemurrageBillingsSet_StatementOfAccountId`
                    ON `DemurrageBillingsSet` (`StatementOfAccountId`)
                    """,
                    cancellationToken);
            }
            catch
            {
                /* index may already exist */
            }

            try
            {
                await db.Database.ExecuteSqlRawAsync(
                    """
                    ALTER TABLE `DemurrageBillingsSet`
                    ADD CONSTRAINT `FK_DemurrageBillings_StatementOfAccounts`
                    FOREIGN KEY (`StatementOfAccountId`) REFERENCES `StatementOfAccountsSet` (`Id`)
                    ON DELETE SET NULL
                    """,
                    cancellationToken);
            }
            catch
            {
                /* constraint may already exist */
            }
        }

        await db.Database.ExecuteSqlRawAsync(
            $"""
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('{migrationId}', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task EnsureSoaTruckerRegistrationsAsync(
        EcmsDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string migrationId = "20260904170000_AddSoaTruckerRegistrations";

        if (await TableExistsAsync(db, "SoaTruckerRegistrationsSet", cancellationToken))
        {
            await db.Database.ExecuteSqlRawAsync(
                $"""
                INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
                VALUES ('{migrationId}', '7.0.20')
                """,
                cancellationToken);
            return;
        }

        logger.LogWarning("Creating missing table SoaTruckerRegistrationsSet");
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE `SoaTruckerRegistrationsSet` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `ShippingLineId` int NOT NULL,
                `TruckerId` int NOT NULL,
                `RegisteredByUserId` int NOT NULL,
                `RegisteredAt` datetime(6) NOT NULL,
                `CreatedAt` datetime(6) NOT NULL,
                PRIMARY KEY (`Id`),
                UNIQUE KEY `IX_SoaTruckerRegistrations_ShippingLineId_TruckerId`
                    (`ShippingLineId`, `TruckerId`),
                CONSTRAINT `FK_SoaTruckerRegistrations_ShippingLines`
                    FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE,
                CONSTRAINT `FK_SoaTruckerRegistrations_Truckers`
                    FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT,
                CONSTRAINT `FK_SoaTruckerRegistrations_RegisteredBy`
                    FOREIGN KEY (`RegisteredByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT
            ) CHARACTER SET=utf8mb4
            """,
            cancellationToken);

        await db.Database.ExecuteSqlRawAsync(
            $"""
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ('{migrationId}', '7.0.20')
            """,
            cancellationToken);
    }

    private static async Task<bool> TableExistsAsync(
        EcmsDbContext db,
        string table,
        CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
            await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT COUNT(*)
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = @table
                """;

            var tableParam = command.CreateParameter();
            tableParam.ParameterName = "@table";
            tableParam.Value = table;
            command.Parameters.Add(tableParam);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result) > 0;
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    private static async Task EnsureColumnAsync(
        EcmsDbContext db,
        ILogger logger,
        string table,
        string column,
        string definition,
        string migrationId,
        CancellationToken cancellationToken)
    {
        var exists = await ColumnExistsAsync(db, table, column, cancellationToken);
        if (!exists)
        {
            logger.LogWarning("Adding missing column {Table}.{Column}", table, column);
            await db.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE `{table}` ADD `{column}` {definition}",
                cancellationToken);
        }

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
            VALUES ({0}, '7.0.20')
            """,
            migrationId);
    }

    private static async Task<bool> ColumnExistsAsync(
        EcmsDbContext db,
        string table,
        string column,
        CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var shouldClose = connection.State != System.Data.ConnectionState.Open;
        if (shouldClose)
            await connection.OpenAsync(cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = @table
                  AND COLUMN_NAME = @column
                """;

            var tableParam = command.CreateParameter();
            tableParam.ParameterName = "@table";
            tableParam.Value = table;
            command.Parameters.Add(tableParam);

            var columnParam = command.CreateParameter();
            columnParam.ParameterName = "@column";
            columnParam.Value = column;
            command.Parameters.Add(columnParam);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result) > 0;
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }
}
