using System;
using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260903020000_AddDemurrageDetentionRates")]
public partial class AddDemurrageDetentionRates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "AppliedRateId",
            table: "DemurrageBillingsSet",
            type: "int",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AppliedRateLabel",
            table: "DemurrageBillingsSet",
            type: "varchar(256)",
            maxLength: 256,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "DemurrageDetentionRatesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                DepotId = table.Column<int>(type: "int", nullable: true),
                ContainerSizeId = table.Column<int>(type: "int", nullable: true),
                DemurrageAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                DetentionAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true),
                IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DemurrageDetentionRatesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_DemurrageDetentionRates_ShippingLines",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_DemurrageDetentionRates_Depots",
                    column: x => x.DepotId,
                    principalTable: "DepotsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_DemurrageDetentionRates_ContainerSizes",
                    column: x => x.ContainerSizeId,
                    principalTable: "ContainerSizesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageDetentionRates_Line_Depot_Size_Active_From",
            table: "DemurrageDetentionRatesSet",
            columns: new[] { "ShippingLineId", "DepotId", "ContainerSizeId", "IsActive", "EffectiveFrom" });

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageDetentionRates_DepotId",
            table: "DemurrageDetentionRatesSet",
            column: "DepotId");

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageDetentionRates_ContainerSizeId",
            table: "DemurrageDetentionRatesSet",
            column: "ContainerSizeId");

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillings_AppliedRateId",
            table: "DemurrageBillingsSet",
            column: "AppliedRateId");

        migrationBuilder.AddForeignKey(
            name: "FK_DemurrageBillings_AppliedRate",
            table: "DemurrageBillingsSet",
            column: "AppliedRateId",
            principalTable: "DemurrageDetentionRatesSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_DemurrageBillings_AppliedRate",
            table: "DemurrageBillingsSet");

        migrationBuilder.DropTable(
            name: "DemurrageDetentionRatesSet");

        migrationBuilder.DropIndex(
            name: "IX_DemurrageBillings_AppliedRateId",
            table: "DemurrageBillingsSet");

        migrationBuilder.DropColumn(
            name: "AppliedRateId",
            table: "DemurrageBillingsSet");

        migrationBuilder.DropColumn(
            name: "AppliedRateLabel",
            table: "DemurrageBillingsSet");
    }
}
