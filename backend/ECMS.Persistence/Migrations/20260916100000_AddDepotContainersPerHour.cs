using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260916100000_AddDepotContainersPerHour")]
public partial class AddDepotContainersPerHour : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "ContainersPerHour",
            table: "DepotsSet",
            type: "int",
            nullable: false,
            defaultValue: 3);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "ContainersPerHour", table: "DepotsSet");
    }
}
