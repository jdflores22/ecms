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
        migrationBuilder.CreateIndex(
            name: "IX_PreAdvicesSet_TruckerId_CreatedAt",
            table: "PreAdvicesSet",
            columns: new[] { "TruckerId", "CreatedAt" });

        migrationBuilder.CreateIndex(
            name: "IX_PreAdvicesSet_ShippingLineId_Status",
            table: "PreAdvicesSet",
            columns: new[] { "ShippingLineId", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_PreAdvicesSet_Status_DemurrageValidUntil",
            table: "PreAdvicesSet",
            columns: new[] { "Status", "DemurrageValidUntil" });

        migrationBuilder.CreateIndex(
            name: "IX_PreAdviceDocumentsSet_PreAdviceId_Category",
            table: "PreAdviceDocumentsSet",
            columns: new[] { "PreAdviceId", "Category" });

        migrationBuilder.CreateIndex(
            name: "IX_SchedulesSet_DepotId_Date_Status",
            table: "SchedulesSet",
            columns: new[] { "DepotId", "Date", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_SchedulesSet_TruckerId",
            table: "SchedulesSet",
            column: "TruckerId");

        migrationBuilder.CreateIndex(
            name: "IX_PaymentsSet_Status_PaidAt",
            table: "PaymentsSet",
            columns: new[] { "Status", "PaidAt" });

        migrationBuilder.CreateIndex(
            name: "IX_AuditLogsSet_Timestamp",
            table: "AuditLogsSet",
            column: "Timestamp");

        migrationBuilder.CreateIndex(
            name: "IX_AuditLogsSet_Module_Timestamp",
            table: "AuditLogsSet",
            columns: new[] { "Module", "Timestamp" });
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
