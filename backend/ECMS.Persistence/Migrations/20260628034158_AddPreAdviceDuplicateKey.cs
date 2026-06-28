using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPreAdviceDuplicateKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActiveRequestKey",
                table: "PreAdvicesSet",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ContainerNoNormalized",
                table: "PreAdvicesSet",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "ContainerSizeId",
                table: "PreAdvicesSet",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ContainerTypeId",
                table: "PreAdvicesSet",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
UPDATE PreAdvicesSet pa
INNER JOIN ContainersSet c ON pa.ContainerId = c.Id
LEFT JOIN ContainerSizesSet cs ON cs.Label = c.Size AND cs.IsActive = 1
LEFT JOIN ContainerTypesSet ct ON ct.Code = c.Type AND ct.IsActive = 1
SET
    pa.ContainerNoNormalized = UPPER(TRIM(c.ContainerNo)),
    pa.ContainerSizeId = COALESCE(
        cs.Id,
        (SELECT Id FROM ContainerSizesSet WHERE IsActive = 1 ORDER BY SortOrder, Id LIMIT 1)
    ),
    pa.ContainerTypeId = COALESCE(
        ct.Id,
        (SELECT Id FROM ContainerTypesSet WHERE IsActive = 1 ORDER BY SortOrder, Id LIMIT 1)
    );
");

            migrationBuilder.Sql(@"
UPDATE PreAdvicesSet
SET ActiveRequestKey = CONCAT(ShippingLineId, '|', ContainerNoNormalized, '|', ContainerSizeId, '|', ContainerTypeId)
WHERE Status IN (0, 1, 2, 3, 6)
  AND ContainerNoNormalized IS NOT NULL
  AND ContainerSizeId IS NOT NULL
  AND ContainerTypeId IS NOT NULL;
");

            migrationBuilder.Sql(@"
UPDATE PreAdvicesSet pa
INNER JOIN (
    SELECT ActiveRequestKey, MIN(Id) AS KeepId
    FROM PreAdvicesSet
    WHERE ActiveRequestKey IS NOT NULL
    GROUP BY ActiveRequestKey
    HAVING COUNT(*) > 1
) dup ON pa.ActiveRequestKey = dup.ActiveRequestKey AND pa.Id <> dup.KeepId
SET pa.ActiveRequestKey = NULL;
");

            migrationBuilder.AlterColumn<string>(
                name: "ContainerNoNormalized",
                table: "PreAdvicesSet",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<int>(
                name: "ContainerSizeId",
                table: "PreAdvicesSet",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ContainerTypeId",
                table: "PreAdvicesSet",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ActiveRequestKey",
                table: "PreAdvicesSet",
                column: "ActiveRequestKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ContainerSizeId",
                table: "PreAdvicesSet",
                column: "ContainerSizeId");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ContainerTypeId",
                table: "PreAdvicesSet",
                column: "ContainerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ShippingLineId_ContainerNoNormalized_Container~",
                table: "PreAdvicesSet",
                columns: new[] { "ShippingLineId", "ContainerNoNormalized", "ContainerSizeId", "ContainerTypeId" });

            migrationBuilder.AddForeignKey(
                name: "FK_PreAdvicesSet_ContainerSizesSet_ContainerSizeId",
                table: "PreAdvicesSet",
                column: "ContainerSizeId",
                principalTable: "ContainerSizesSet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PreAdvicesSet_ContainerTypesSet_ContainerTypeId",
                table: "PreAdvicesSet",
                column: "ContainerTypeId",
                principalTable: "ContainerTypesSet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PreAdvicesSet_ContainerSizesSet_ContainerSizeId",
                table: "PreAdvicesSet");

            migrationBuilder.DropForeignKey(
                name: "FK_PreAdvicesSet_ContainerTypesSet_ContainerTypeId",
                table: "PreAdvicesSet");

            migrationBuilder.DropIndex(
                name: "IX_PreAdvicesSet_ActiveRequestKey",
                table: "PreAdvicesSet");

            migrationBuilder.DropIndex(
                name: "IX_PreAdvicesSet_ContainerSizeId",
                table: "PreAdvicesSet");

            migrationBuilder.DropIndex(
                name: "IX_PreAdvicesSet_ContainerTypeId",
                table: "PreAdvicesSet");

            migrationBuilder.DropIndex(
                name: "IX_PreAdvicesSet_ShippingLineId_ContainerNoNormalized_Container~",
                table: "PreAdvicesSet");

            migrationBuilder.DropColumn(
                name: "ActiveRequestKey",
                table: "PreAdvicesSet");

            migrationBuilder.DropColumn(
                name: "ContainerNoNormalized",
                table: "PreAdvicesSet");

            migrationBuilder.DropColumn(
                name: "ContainerSizeId",
                table: "PreAdvicesSet");

            migrationBuilder.DropColumn(
                name: "ContainerTypeId",
                table: "PreAdvicesSet");
        }
    }
}
