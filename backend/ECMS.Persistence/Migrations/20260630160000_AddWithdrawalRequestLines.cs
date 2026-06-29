using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260630160000_AddWithdrawalRequestLines")]
public partial class AddWithdrawalRequestLines : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "WithdrawalRequestLinesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                WithdrawalRequestId = table.Column<int>(type: "int", nullable: false),
                LineNo = table.Column<int>(type: "int", nullable: false),
                ContainerId = table.Column<int>(type: "int", nullable: false),
                ContainerNoNormalized = table.Column<string>(type: "varchar(255)", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ContainerSizeId = table.Column<int>(type: "int", nullable: false),
                ContainerTypeId = table.Column<int>(type: "int", nullable: false),
                ActiveRequestKey = table.Column<string>(type: "varchar(255)", nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                LineStatus = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_WithdrawalRequestLinesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestLinesSet_ContainersSet_ContainerId",
                    column: x => x.ContainerId,
                    principalTable: "ContainersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestLinesSet_ContainerSizesSet_ContainerSizeId",
                    column: x => x.ContainerSizeId,
                    principalTable: "ContainerSizesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestLinesSet_ContainerTypesSet_ContainerTypeId",
                    column: x => x.ContainerTypeId,
                    principalTable: "ContainerTypesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestLinesSet_WithdrawalRequestsSet_WithdrawalRequestId",
                    column: x => x.WithdrawalRequestId,
                    principalTable: "WithdrawalRequestsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.Sql("""
            INSERT INTO WithdrawalRequestLinesSet
                (WithdrawalRequestId, LineNo, ContainerId, ContainerNoNormalized, ContainerSizeId, ContainerTypeId, ActiveRequestKey, LineStatus, CreatedAt)
            SELECT
                Id,
                1,
                ContainerId,
                ContainerNoNormalized,
                ContainerSizeId,
                ContainerTypeId,
                ActiveRequestKey,
                CASE Status
                    WHEN 4 THEN 1
                    WHEN 5 THEN 2
                    WHEN 6 THEN 3
                    ELSE 0
                END,
                CreatedAt
            FROM WithdrawalRequestsSet
            WHERE ContainerId IS NOT NULL AND ContainerId > 0
            """);

        migrationBuilder.DropForeignKey(
            name: "FK_WithdrawalRequestsSet_ContainersSet_ContainerId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropForeignKey(
            name: "FK_WithdrawalRequestsSet_ContainerSizesSet_ContainerSizeId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropForeignKey(
            name: "FK_WithdrawalRequestsSet_ContainerTypesSet_ContainerTypeId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_ActiveRequestKey",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WR_ContainerNo_Size_Type",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_ContainerId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_ContainerSizeId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropIndex(
            name: "IX_WithdrawalRequestsSet_ContainerTypeId",
            table: "WithdrawalRequestsSet");

        migrationBuilder.DropColumn(name: "ActiveRequestKey", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "ContainerId", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "ContainerNoNormalized", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "ContainerSizeId", table: "WithdrawalRequestsSet");
        migrationBuilder.DropColumn(name: "ContainerTypeId", table: "WithdrawalRequestsSet");

        migrationBuilder.CreateIndex(
            name: "IX_WRL_ActiveRequestKey",
            table: "WithdrawalRequestLinesSet",
            column: "ActiveRequestKey",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_WRL_ContainerId",
            table: "WithdrawalRequestLinesSet",
            column: "ContainerId");

        migrationBuilder.CreateIndex(
            name: "IX_WRL_ContainerNo_Size_Type",
            table: "WithdrawalRequestLinesSet",
            columns: new[] { "ContainerNoNormalized", "ContainerSizeId", "ContainerTypeId" });

        migrationBuilder.CreateIndex(
            name: "IX_WRL_ContainerSizeId",
            table: "WithdrawalRequestLinesSet",
            column: "ContainerSizeId");

        migrationBuilder.CreateIndex(
            name: "IX_WRL_ContainerTypeId",
            table: "WithdrawalRequestLinesSet",
            column: "ContainerTypeId");

        migrationBuilder.CreateIndex(
            name: "IX_WRL_RequestId_LineNo",
            table: "WithdrawalRequestLinesSet",
            columns: new[] { "WithdrawalRequestId", "LineNo" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ActiveRequestKey",
            table: "WithdrawalRequestsSet",
            type: "varchar(128)",
            maxLength: 128,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<int>(
            name: "ContainerId",
            table: "WithdrawalRequestsSet",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "ContainerNoNormalized",
            table: "WithdrawalRequestsSet",
            type: "varchar(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "")
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<int>(
            name: "ContainerSizeId",
            table: "WithdrawalRequestsSet",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "ContainerTypeId",
            table: "WithdrawalRequestsSet",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.Sql("""
            UPDATE WithdrawalRequestsSet w
            INNER JOIN WithdrawalRequestLinesSet l ON l.WithdrawalRequestId = w.Id AND l.LineNo = 1
            SET
                w.ContainerId = l.ContainerId,
                w.ContainerNoNormalized = l.ContainerNoNormalized,
                w.ContainerSizeId = l.ContainerSizeId,
                w.ContainerTypeId = l.ContainerTypeId,
                w.ActiveRequestKey = l.ActiveRequestKey
            """);

        migrationBuilder.DropTable(name: "WithdrawalRequestLinesSet");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ActiveRequestKey",
            table: "WithdrawalRequestsSet",
            column: "ActiveRequestKey",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ContainerId",
            table: "WithdrawalRequestsSet",
            column: "ContainerId");

        migrationBuilder.CreateIndex(
            name: "IX_WR_ContainerNo_Size_Type",
            table: "WithdrawalRequestsSet",
            columns: new[] { "ContainerNoNormalized", "ContainerSizeId", "ContainerTypeId" });

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ContainerSizeId",
            table: "WithdrawalRequestsSet",
            column: "ContainerSizeId");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ContainerTypeId",
            table: "WithdrawalRequestsSet",
            column: "ContainerTypeId");

        migrationBuilder.AddForeignKey(
            name: "FK_WithdrawalRequestsSet_ContainersSet_ContainerId",
            table: "WithdrawalRequestsSet",
            column: "ContainerId",
            principalTable: "ContainersSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);

        migrationBuilder.AddForeignKey(
            name: "FK_WithdrawalRequestsSet_ContainerSizesSet_ContainerSizeId",
            table: "WithdrawalRequestsSet",
            column: "ContainerSizeId",
            principalTable: "ContainerSizesSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);

        migrationBuilder.AddForeignKey(
            name: "FK_WithdrawalRequestsSet_ContainerTypesSet_ContainerTypeId",
            table: "WithdrawalRequestsSet",
            column: "ContainerTypeId",
            principalTable: "ContainerTypesSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }
}
