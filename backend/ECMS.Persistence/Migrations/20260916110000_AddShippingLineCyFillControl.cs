using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260916110000_AddShippingLineCyFillControl")]
public partial class AddShippingLineCyFillControl : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "CyFillStrategy",
            table: "ShippingLinesSet",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.CreateTable(
            name: "ShippingLineDepotFillPrioritiesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                DepotId = table.Column<int>(type: "int", nullable: false),
                SortOrder = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ShippingLineDepotFillPrioritiesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_SLDepotFillPriorities_DepotId",
                    column: x => x.DepotId,
                    principalTable: "DepotsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_SLDepotFillPriorities_ShippingLineId",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateTable(
            name: "ShippingLineDailyDepotFillsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                EffectiveDate = table.Column<DateOnly>(type: "date", nullable: false),
                PrimaryDepotId = table.Column<int>(type: "int", nullable: false),
                SetByUserId = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ShippingLineDailyDepotFillsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_SLDailyDepotFills_DepotId",
                    column: x => x.PrimaryDepotId,
                    principalTable: "DepotsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_SLDailyDepotFills_SetByUserId",
                    column: x => x.SetByUserId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_SLDailyDepotFills_ShippingLineId",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_SLDepotFillPriorities_ShippingLineId_DepotId",
            table: "ShippingLineDepotFillPrioritiesSet",
            columns: new[] { "ShippingLineId", "DepotId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_SLDepotFillPriorities_ShippingLineId_SortOrder",
            table: "ShippingLineDepotFillPrioritiesSet",
            columns: new[] { "ShippingLineId", "SortOrder" });

        migrationBuilder.CreateIndex(
            name: "IX_SLDepotFillPriorities_DepotId",
            table: "ShippingLineDepotFillPrioritiesSet",
            column: "DepotId");

        migrationBuilder.CreateIndex(
            name: "IX_SLDailyDepotFills_ShippingLineId_EffectiveDate",
            table: "ShippingLineDailyDepotFillsSet",
            columns: new[] { "ShippingLineId", "EffectiveDate" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ShippingLineDailyDepotFillsSet");
        migrationBuilder.DropTable(name: "ShippingLineDepotFillPrioritiesSet");
        migrationBuilder.DropColumn(name: "CyFillStrategy", table: "ShippingLinesSet");
    }
}
