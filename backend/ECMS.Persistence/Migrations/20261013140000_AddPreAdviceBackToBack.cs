using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261013140000_AddPreAdviceBackToBack")]
public partial class AddPreAdviceBackToBack : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "BackToBackCompanionContainerNo",
            table: "PreAdvicesSet",
            type: "varchar(11)",
            maxLength: 11,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<bool>(
            name: "IsBackToBack",
            table: "PreAdvicesSet",
            type: "tinyint(1)",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "BackToBackCompanionContainerNo", table: "PreAdvicesSet");
        migrationBuilder.DropColumn(name: "IsBackToBack", table: "PreAdvicesSet");
    }
}
