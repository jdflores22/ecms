using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddManualYardInventoryEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ManualYardInventoryEntriesSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ContainerNo = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ContainerSizeId = table.Column<int>(type: "int", nullable: false),
                    ContainerTypeId = table.Column<int>(type: "int", nullable: false),
                    DepotId = table.Column<int>(type: "int", nullable: false),
                    ShippingLineId = table.Column<int>(type: "int", nullable: false),
                    YardInDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManualYardInventoryEntriesSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManualYardInventoryEntriesSet_ContainerSizesSet_ContainerSiz~",
                        column: x => x.ContainerSizeId,
                        principalTable: "ContainerSizesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ManualYardInventoryEntriesSet_ContainerTypesSet_ContainerTyp~",
                        column: x => x.ContainerTypeId,
                        principalTable: "ContainerTypesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ManualYardInventoryEntriesSet_DepotsSet_DepotId",
                        column: x => x.DepotId,
                        principalTable: "DepotsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ManualYardInventoryEntriesSet_ShippingLinesSet_ShippingLineId",
                        column: x => x.ShippingLineId,
                        principalTable: "ShippingLinesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ManualYardInventoryEntriesSet_UsersSet_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ManualYardInventoryEntriesSet_ContainerSizeId",
                table: "ManualYardInventoryEntriesSet",
                column: "ContainerSizeId");

            migrationBuilder.CreateIndex(
                name: "IX_ManualYardInventoryEntriesSet_ContainerTypeId",
                table: "ManualYardInventoryEntriesSet",
                column: "ContainerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ManualYardInventoryEntriesSet_CreatedByUserId",
                table: "ManualYardInventoryEntriesSet",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ManualYardInventoryEntriesSet_DepotId",
                table: "ManualYardInventoryEntriesSet",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_ManualYardInventoryEntriesSet_ShippingLineId_ContainerNo_Dep~",
                table: "ManualYardInventoryEntriesSet",
                columns: new[] { "ShippingLineId", "ContainerNo", "DepotId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManualYardInventoryEntriesSet");
        }
    }
}
