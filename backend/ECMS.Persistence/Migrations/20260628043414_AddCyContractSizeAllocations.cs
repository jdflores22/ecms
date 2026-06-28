using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCyContractSizeAllocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShippingLineDepotContractSizeAllocation",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ContractId = table.Column<int>(type: "int", nullable: false),
                    ContainerSizeId = table.Column<int>(type: "int", nullable: false),
                    ContractCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingLineDepotContractSizeAllocation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShippingLineDepotContractSizeAllocation_ContainerSizesSet_Co~",
                        column: x => x.ContainerSizeId,
                        principalTable: "ContainerSizesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShippingLineDepotContractSizeAllocation_ShippingLineDepotCon~",
                        column: x => x.ContractId,
                        principalTable: "ShippingLineDepotContractsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ShippingLineDepotContractSizeAllocation_ContainerSizeId",
                table: "ShippingLineDepotContractSizeAllocation",
                column: "ContainerSizeId");

            migrationBuilder.CreateIndex(
                name: "IX_ShippingLineDepotContractSizeAllocation_ContractId_Container~",
                table: "ShippingLineDepotContractSizeAllocation",
                columns: new[] { "ContractId", "ContainerSizeId" },
                unique: true);

            migrationBuilder.Sql(@"
INSERT INTO ShippingLineDepotContractSizeAllocation (ContractId, ContainerSizeId, ContractCount, CreatedAt)
SELECT
    c.Id,
    cs.Id,
    GREATEST(1, FLOOR(c.ContractTeu / GREATEST(cs.Teu, 1))),
    UTC_TIMESTAMP(6)
FROM ShippingLineDepotContractsSet c
INNER JOIN ContainerSizesSet cs ON cs.IsActive = 1
WHERE cs.Id = (
    SELECT cs2.Id FROM ContainerSizesSet cs2
    WHERE cs2.IsActive = 1
    ORDER BY cs2.Teu DESC, cs2.SortOrder ASC
    LIMIT 1
);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShippingLineDepotContractSizeAllocation");
        }
    }
}
