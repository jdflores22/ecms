using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260705120000_AddWithdrawalBookingFlow")]
public partial class AddWithdrawalBookingFlow : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "BookingNumber",
            table: "WithdrawalRequestsSet",
            type: "varchar(128)",
            maxLength: 128,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "TruckingCompany",
            table: "WithdrawalRequestsSet",
            type: "varchar(256)",
            maxLength: 256,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "PlateNumber",
            table: "WithdrawalRequestsSet",
            type: "varchar(32)",
            maxLength: 32,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "DriverName",
            table: "WithdrawalRequestsSet",
            type: "varchar(256)",
            maxLength: 256,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<int>(
            name: "RequestedDepotId",
            table: "WithdrawalRequestsSet",
            type: "int",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "AssignedDepotId",
            table: "WithdrawalRequestsSet",
            type: "int",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "BookedAt",
            table: "WithdrawalRequestsSet",
            type: "datetime(6)",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "CyAssignedAt",
            table: "WithdrawalRequestsSet",
            type: "datetime(6)",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "CyAssignedByUserId",
            table: "WithdrawalRequestsSet",
            type: "int",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_AssignedDepotId",
            table: "WithdrawalRequestsSet",
            column: "AssignedDepotId");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_CyAssignedByUserId",
            table: "WithdrawalRequestsSet",
            column: "CyAssignedByUserId");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_RequestedDepotId",
            table: "WithdrawalRequestsSet",
            column: "RequestedDepotId");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ShippingLineId_Status",
            table: "WithdrawalRequestsSet",
            columns: new[] { "ShippingLineId", "Status" });

        migrationBuilder.AddForeignKey(
            name: "FK_WithdrawalRequestsSet_DepotsSet_AssignedDepotId",
            table: "WithdrawalRequestsSet",
            column: "AssignedDepotId",
            principalTable: "DepotsSet",
            principalColumn: "Id");

        migrationBuilder.AddForeignKey(
            name: "FK_WithdrawalRequestsSet_DepotsSet_RequestedDepotId",
            table: "WithdrawalRequestsSet",
            column: "RequestedDepotId",
            principalTable: "DepotsSet",
            principalColumn: "Id");

        migrationBuilder.AddForeignKey(
            name: "FK_WithdrawalRequestsSet_UsersSet_CyAssignedByUserId",
            table: "WithdrawalRequestsSet",
            column: "CyAssignedByUserId",
            principalTable: "UsersSet",
            principalColumn: "Id");

        migrationBuilder.CreateTable(
            name: "WithdrawalSchedulesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                WithdrawalRequestId = table.Column<int>(type: "int", nullable: false),
                DepotId = table.Column<int>(type: "int", nullable: false),
                Date = table.Column<DateOnly>(type: "date", nullable: false),
                Time = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                SlotNo = table.Column<int>(type: "int", nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                TruckerId = table.Column<int>(type: "int", nullable: true),
                DepotRemarks = table.Column<string>(type: "longtext", nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_WithdrawalSchedulesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_WSched_DepotId",
                    column: x => x.DepotId,
                    principalTable: "DepotsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WSched_TruckerId",
                    column: x => x.TruckerId,
                    principalTable: "UsersSet",
                    principalColumn: "Id");
                table.ForeignKey(
                    name: "FK_WSched_WithdrawalRequestId",
                    column: x => x.WithdrawalRequestId,
                    principalTable: "WithdrawalRequestsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_WSched_DepotId_Date_SlotNo",
            table: "WithdrawalSchedulesSet",
            columns: new[] { "DepotId", "Date", "SlotNo" });

        migrationBuilder.CreateIndex(
            name: "IX_WSched_TruckerId",
            table: "WithdrawalSchedulesSet",
            column: "TruckerId");

        migrationBuilder.CreateIndex(
            name: "IX_WSched_WithdrawalRequestId",
            table: "WithdrawalSchedulesSet",
            column: "WithdrawalRequestId",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "WithdrawalSchedulesSet");

        migrationBuilder.DropForeignKey(
            name: "FK_WithdrawalRequestsSet_DepotsSet_AssignedDepotId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropForeignKey(
            name: "FK_WithdrawalRequestsSet_DepotsSet_RequestedDepotId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropForeignKey(
            name: "FK_WithdrawalRequestsSet_UsersSet_CyAssignedByUserId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_AssignedDepotId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_CyAssignedByUserId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_RequestedDepotId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_ShippingLineId_Status",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropColumn(name: "BookingNumber", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "TruckingCompany", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "PlateNumber", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "DriverName", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "RequestedDepotId", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "AssignedDepotId", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "BookedAt", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "CyAssignedAt", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "CyAssignedByUserId", table: "WithdrawalRequestsSet");
    }
}
