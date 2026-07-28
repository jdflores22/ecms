using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260728120000_AddQrBookingConfirmationPdfPath")]
public partial class AddQrBookingConfirmationPdfPath : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ConfirmationPdfPath",
            table: "QRBookingsSet",
            type: "longtext",
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ConfirmationPdfPath",
            table: "QRBookingsSet");
    }
}
