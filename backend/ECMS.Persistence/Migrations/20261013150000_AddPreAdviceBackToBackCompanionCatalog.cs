using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261013150000_AddPreAdviceBackToBackCompanionCatalog")]
public partial class AddPreAdviceBackToBackCompanionCatalog : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "BackToBackCompanionContainerSizeId",
            table: "PreAdvicesSet",
            type: "int",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "BackToBackCompanionContainerTypeId",
            table: "PreAdvicesSet",
            type: "int",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_PreAdvicesSet_BackToBackCompanionContainerSizeId",
            table: "PreAdvicesSet",
            column: "BackToBackCompanionContainerSizeId");

        migrationBuilder.CreateIndex(
            name: "IX_PreAdvicesSet_BackToBackCompanionContainerTypeId",
            table: "PreAdvicesSet",
            column: "BackToBackCompanionContainerTypeId");

        migrationBuilder.AddForeignKey(
            name: "FK_PreAdvicesSet_BackToBackCompanionContainerSizeId",
            table: "PreAdvicesSet",
            column: "BackToBackCompanionContainerSizeId",
            principalTable: "ContainerSizesSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_PreAdvicesSet_BackToBackCompanionContainerTypeId",
            table: "PreAdvicesSet",
            column: "BackToBackCompanionContainerTypeId",
            principalTable: "ContainerTypesSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_PreAdvicesSet_BackToBackCompanionContainerSizeId",
            table: "PreAdvicesSet");

        migrationBuilder.DropForeignKey(
            name: "FK_PreAdvicesSet_BackToBackCompanionContainerTypeId",
            table: "PreAdvicesSet");

        migrationBuilder.DropIndex(
            name: "IX_PreAdvicesSet_BackToBackCompanionContainerSizeId",
            table: "PreAdvicesSet");

        migrationBuilder.DropIndex(
            name: "IX_PreAdvicesSet_BackToBackCompanionContainerTypeId",
            table: "PreAdvicesSet");

        migrationBuilder.DropColumn(name: "BackToBackCompanionContainerSizeId", table: "PreAdvicesSet");
        migrationBuilder.DropColumn(name: "BackToBackCompanionContainerTypeId", table: "PreAdvicesSet");
    }
}
