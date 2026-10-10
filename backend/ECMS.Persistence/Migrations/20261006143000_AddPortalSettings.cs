using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261006143000_AddPortalSettings")]
public partial class AddPortalSettings : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PortalSettingsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false),
                IcsCroEdoQrEnabled = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                SoaEnabled = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                WithdrawalsEnabled = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PortalSettingsSet", x => x.Id);
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "PortalSettingsSet");
    }
}
