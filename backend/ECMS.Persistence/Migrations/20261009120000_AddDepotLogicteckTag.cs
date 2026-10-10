using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261009120000_AddDepotLogicteckTag")]
public partial class AddDepotLogicteckTag : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsLogicteck",
            table: "DepotsSet",
            type: "tinyint(1)",
            nullable: false,
            defaultValue: false);

        migrationBuilder.Sql(
            "UPDATE `DepotsSet` SET `IsLogicteck` = 1 WHERE UPPER(TRIM(`Name`)) = 'ESAFE';");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "IsLogicteck", table: "DepotsSet");
    }
}
