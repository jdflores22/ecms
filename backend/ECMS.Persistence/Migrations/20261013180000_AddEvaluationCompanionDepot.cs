using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261013180000_AddEvaluationCompanionDepot")]
public partial class AddEvaluationCompanionDepot : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "BackToBackCompanionDepotId",
            table: "EvaluationsSet",
            type: "int",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_EvaluationsSet_BackToBackCompanionDepotId",
            table: "EvaluationsSet",
            column: "BackToBackCompanionDepotId");

        migrationBuilder.AddForeignKey(
            name: "FK_EvaluationsSet_BackToBackCompanionDepotId",
            table: "EvaluationsSet",
            column: "BackToBackCompanionDepotId",
            principalTable: "DepotsSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_EvaluationsSet_BackToBackCompanionDepotId",
            table: "EvaluationsSet");

        migrationBuilder.DropIndex(
            name: "IX_EvaluationsSet_BackToBackCompanionDepotId",
            table: "EvaluationsSet");

        migrationBuilder.DropColumn(
            name: "BackToBackCompanionDepotId",
            table: "EvaluationsSet");
    }
}
