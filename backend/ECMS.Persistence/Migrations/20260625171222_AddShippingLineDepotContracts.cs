using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddShippingLineDepotContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShippingLineDepotContractsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ShippingLineId = table.Column<int>(type: "int", nullable: false),
                    DepotId = table.Column<int>(type: "int", nullable: false),
                    ContractTeu = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingLineDepotContractsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShippingLineDepotContractsSet_DepotsSet_DepotId",
                        column: x => x.DepotId,
                        principalTable: "DepotsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShippingLineDepotContractsSet_ShippingLinesSet_ShippingLineId",
                        column: x => x.ShippingLineId,
                        principalTable: "ShippingLinesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ShippingLineDepotContractsSet_DepotId",
                table: "ShippingLineDepotContractsSet",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_ShippingLineDepotContractsSet_ShippingLineId_DepotId",
                table: "ShippingLineDepotContractsSet",
                columns: new[] { "ShippingLineId", "DepotId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShippingLineDepotContractsSet");
        }
    }
}
