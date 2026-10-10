using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260629160000_AddPerformanceIndexes")]
public partial class AddPerformanceIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // MySQL commits each DDL statement; use idempotent CREATE INDEX for partial-failure retries.
        CreateIndexIfMissing(migrationBuilder, "PreAdvicesSet", "IX_PreAdvicesSet_TruckerId_CreatedAt", "`TruckerId`, `CreatedAt`");
        CreateIndexIfMissing(migrationBuilder, "PreAdvicesSet", "IX_PreAdvicesSet_ShippingLineId_Status", "`ShippingLineId`, `Status`");
        CreateIndexIfMissing(migrationBuilder, "PreAdvicesSet", "IX_PreAdvicesSet_Status_DemurrageValidUntil", "`Status`, `DemurrageValidUntil`");
        CreateIndexIfMissing(migrationBuilder, "PreAdviceDocumentsSet", "IX_PreAdviceDocumentsSet_PreAdviceId_Category", "`PreAdviceId`, `Category`");
        CreateIndexIfMissing(migrationBuilder, "SchedulesSet", "IX_SchedulesSet_DepotId_Date_Status", "`DepotId`, `Date`, `Status`");
        CreateIndexIfMissing(migrationBuilder, "SchedulesSet", "IX_SchedulesSet_TruckerId", "`TruckerId`");
        CreateIndexIfMissing(migrationBuilder, "PaymentsSet", "IX_PaymentsSet_Status_PaidAt", "`Status`, `PaidAt`");
        CreateIndexIfMissing(migrationBuilder, "AuditLogsSet", "IX_AuditLogsSet_Timestamp", "`Timestamp`");
        // Module is longtext in InitialCreate; index requires a prefix on MariaDB/MySQL.
        CreateIndexIfMissing(migrationBuilder, "AuditLogsSet", "IX_AuditLogsSet_Module_Timestamp", "`Module`(191), `Timestamp`");
    }

    private static void CreateIndexIfMissing(MigrationBuilder migrationBuilder, string table, string indexName, string columnsSql)
    {
        migrationBuilder.Sql($"""
            SET @ecms_idx_exists := (
                SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = '{table}'
                  AND INDEX_NAME = '{indexName}'
            );
            SET @ecms_idx_sql := IF(
                @ecms_idx_exists = 0,
                'CREATE INDEX `{indexName}` ON `{table}` ({columnsSql})',
                'SELECT 1'
            );
            PREPARE ecms_idx_stmt FROM @ecms_idx_sql;
            EXECUTE ecms_idx_stmt;
            DEALLOCATE PREPARE ecms_idx_stmt;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_PreAdvicesSet_TruckerId_CreatedAt", table: "PreAdvicesSet");
        migrationBuilder.DropIndex(name: "IX_PreAdvicesSet_ShippingLineId_Status", table: "PreAdvicesSet");
        migrationBuilder.DropIndex(name: "IX_PreAdvicesSet_Status_DemurrageValidUntil", table: "PreAdvicesSet");
        migrationBuilder.DropIndex(name: "IX_PreAdviceDocumentsSet_PreAdviceId_Category", table: "PreAdviceDocumentsSet");
        migrationBuilder.DropIndex(name: "IX_SchedulesSet_DepotId_Date_Status", table: "SchedulesSet");
        migrationBuilder.DropIndex(name: "IX_SchedulesSet_TruckerId", table: "SchedulesSet");
        migrationBuilder.DropIndex(name: "IX_PaymentsSet_Status_PaidAt", table: "PaymentsSet");
        migrationBuilder.DropIndex(name: "IX_AuditLogsSet_Timestamp", table: "AuditLogsSet");
        migrationBuilder.DropIndex(name: "IX_AuditLogsSet_Module_Timestamp", table: "AuditLogsSet");
    }
}
