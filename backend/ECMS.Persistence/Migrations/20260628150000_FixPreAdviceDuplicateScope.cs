using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixPreAdviceDuplicateScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE PreAdvicesSet SET ActiveRequestKey = NULL WHERE Status = 0;
");

            migrationBuilder.Sql(@"
UPDATE PreAdvicesSet SET ActiveRequestKey = NULL WHERE Status IN (4, 5);
");

            migrationBuilder.Sql(@"
UPDATE PreAdvicesSet
SET ActiveRequestKey = CONCAT(ContainerNoNormalized, '|', ContainerSizeId, '|', ContainerTypeId)
WHERE Status IN (1, 2, 3, 6)
  AND ContainerNoNormalized IS NOT NULL
  AND ContainerNoNormalized <> ''
  AND ContainerSizeId > 0
  AND ContainerTypeId > 0;
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

            migrationBuilder.DropIndex(
                name: "IX_PreAdvicesSet_ShippingLineId_ContainerNoNormalized_Container~",
                table: "PreAdvicesSet");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ContainerNoNormalized_ContainerSizeId_Contain~",
                table: "PreAdvicesSet",
                columns: new[] { "ContainerNoNormalized", "ContainerSizeId", "ContainerTypeId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PreAdvicesSet_ContainerNoNormalized_ContainerSizeId_Contain~",
                table: "PreAdvicesSet");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ShippingLineId_ContainerNoNormalized_Container~",
                table: "PreAdvicesSet",
                columns: new[] { "ShippingLineId", "ContainerNoNormalized", "ContainerSizeId", "ContainerTypeId" });
        }
    }
}
