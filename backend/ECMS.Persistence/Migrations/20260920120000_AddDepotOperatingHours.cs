using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260920120000_AddDepotOperatingHours")]
public partial class AddDepotOperatingHours : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "OperatingHourStart",
            table: "DepotsSet",
            type: "int",
            nullable: false,
            defaultValue: 8);

        migrationBuilder.AddColumn<int>(
            name: "OperatingHourEnd",
            table: "DepotsSet",
            type: "int",
            nullable: false,
            defaultValue: 17);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "OperatingHourStart", table: "DepotsSet");
        migrationBuilder.DropColumn(name: "OperatingHourEnd", table: "DepotsSet");
    }
}
