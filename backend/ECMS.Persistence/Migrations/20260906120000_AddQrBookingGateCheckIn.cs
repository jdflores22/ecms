using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260906120000_AddQrBookingGateCheckIn")]
public partial class AddQrBookingGateCheckIn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "GateCheckedInAt",
            table: "QRBookingsSet",
            type: "datetime(6)",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "GateCheckedInByUserId",
            table: "QRBookingsSet",
            type: "int",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_QRBookingsSet_GateCheckedInByUserId",
            table: "QRBookingsSet",
            column: "GateCheckedInByUserId");

        migrationBuilder.AddForeignKey(
            name: "FK_QRBookingsSet_UsersSet_GateCheckedInByUserId",
            table: "QRBookingsSet",
            column: "GateCheckedInByUserId",
            principalTable: "UsersSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_QRBookingsSet_UsersSet_GateCheckedInByUserId",
            table: "QRBookingsSet");

        migrationBuilder.DropIndex(
            name: "IX_QRBookingsSet_GateCheckedInByUserId",
            table: "QRBookingsSet");

        migrationBuilder.DropColumn(
            name: "GateCheckedInAt",
            table: "QRBookingsSet");

        migrationBuilder.DropColumn(
            name: "GateCheckedInByUserId",
            table: "QRBookingsSet");
    }
}
