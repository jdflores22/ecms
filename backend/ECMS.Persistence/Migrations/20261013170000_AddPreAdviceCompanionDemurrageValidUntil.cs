using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261013170000_AddPreAdviceCompanionDemurrageValidUntil")]
public partial class AddPreAdviceCompanionDemurrageValidUntil : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateOnly>(
            name: "BackToBackCompanionDemurrageValidUntil",
            table: "PreAdvicesSet",
            type: "date",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "BackToBackCompanionDemurrageValidUntil", table: "PreAdvicesSet");
    }
}
