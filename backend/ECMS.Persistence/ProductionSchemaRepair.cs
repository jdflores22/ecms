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

        await EnsureWithdrawalBookingFlowAsync(db, logger, cancellationToken);

        await EnsureDevicePushTokensTableAsync(db, logger, cancellationToken);

        await EnsureCertificateTemplatesTableAsync(db, logger, cancellationToken);

        await EnsureCertificateVerificationsTableAsync(db, logger, cancellationToken);

        await EnsureDepotBroadcastsTableAsync(db, logger, cancellationToken);

        await EnsureTruckerNewsTableAsync(db, logger, cancellationToken);

        await EnsureYardInventoryReleaseStatusAsync(db, logger, cancellationToken);
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
