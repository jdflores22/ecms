using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260629140000_AddDemurrageBillingFeeLines")]
public partial class AddDemurrageBillingFeeLines : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DemurrageBillingFeeLinesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                DemurrageBillingId = table.Column<int>(type: "int", nullable: false),
                Description = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                SortOrder = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DemurrageBillingFeeLinesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_DmgFeeLines_Billing",
                    column: x => x.DemurrageBillingId,
                    principalTable: "DemurrageBillingsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingFeeLinesSet_DemurrageBillingId",
            table: "DemurrageBillingFeeLinesSet",
            column: "DemurrageBillingId");

        migrationBuilder.Sql(@"
INSERT INTO DemurrageBillingFeeLinesSet (DemurrageBillingId, Description, Amount, SortOrder, CreatedAt)
SELECT Id, 'Demurrage', DemurrageAmount, 1, CreatedAt FROM DemurrageBillingsSet WHERE DemurrageAmount > 0;

INSERT INTO DemurrageBillingFeeLinesSet (DemurrageBillingId, Description, Amount, SortOrder, CreatedAt)
SELECT Id, 'Detention', DetentionAmount, 2, CreatedAt FROM DemurrageBillingsSet WHERE DetentionAmount > 0;
");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "DemurrageBillingFeeLinesSet");
    }
}
