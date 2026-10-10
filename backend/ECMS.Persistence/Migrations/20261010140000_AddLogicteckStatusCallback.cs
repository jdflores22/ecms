using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261010140000_AddLogicteckStatusCallback")]
public partial class AddLogicteckStatusCallback : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "LogicteckUpdateStatus",
            table: "QRBookingsSet",
            type: "varchar(40)",
            maxLength: 40,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "LogicteckUpdateLocation",
            table: "QRBookingsSet",
            type: "varchar(40)",
            maxLength: 40,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "LogicteckUpdateMessage",
            table: "QRBookingsSet",
            type: "varchar(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "LogicteckUpdatedAt",
            table: "QRBookingsSet",
            type: "datetime(6)",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "LogicteckStatusUpdatesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                QRBookingId = table.Column<int>(type: "int", nullable: false),
                EventId = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                Status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                Location = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                Message = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                OccurredAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_LogicteckStatusUpdatesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_LogicteckStatusUpdatesSet_QRBookingsSet_QRBookingId",
                    column: x => x.QRBookingId,
                    principalTable: "QRBookingsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_LogicteckStatusUpdatesSet_EventId",
            table: "LogicteckStatusUpdatesSet",
            column: "EventId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_LogicteckStatusUpdatesSet_QRBookingId_CreatedAt",
            table: "LogicteckStatusUpdatesSet",
            columns: new[] { "QRBookingId", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "LogicteckStatusUpdatesSet");
        migrationBuilder.DropColumn(name: "LogicteckUpdateStatus", table: "QRBookingsSet");
        migrationBuilder.DropColumn(name: "LogicteckUpdateLocation", table: "QRBookingsSet");
        migrationBuilder.DropColumn(name: "LogicteckUpdateMessage", table: "QRBookingsSet");
        migrationBuilder.DropColumn(name: "LogicteckUpdatedAt", table: "QRBookingsSet");
    }
}
