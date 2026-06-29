using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260629120000_AddDemurrageBilling")]
public partial class AddDemurrageBilling : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateOnly>(
            name: "DemurrageValidUntil",
            table: "PreAdvicesSet",
            type: "date",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "DemurrageFeeAmount",
            table: "PaymentSettingsSet",
            type: "decimal(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 3500m);

        migrationBuilder.AddColumn<decimal>(
            name: "DetentionFeeAmount",
            table: "PaymentSettingsSet",
            type: "decimal(18,2)",
            precision: 18,
            scale: 2,
            nullable: false,
            defaultValue: 2500m);

        migrationBuilder.CreateTable(
            name: "DemurrageBillingsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ReferenceNo = table.Column<string>(type: "varchar(255)", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                PreAdviceId = table.Column<int>(type: "int", nullable: false),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                TruckerId = table.Column<int>(type: "int", nullable: false),
                ContainerNoNormalized = table.Column<string>(type: "varchar(255)", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ContainerSizeId = table.Column<int>(type: "int", nullable: false),
                ContainerTypeId = table.Column<int>(type: "int", nullable: false),
                DemurrageValidUntil = table.Column<DateOnly>(type: "date", nullable: false),
                ExpiredOn = table.Column<DateOnly>(type: "date", nullable: false),
                DemurrageAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                DetentionAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                ProofFile = table.Column<string>(type: "longtext", nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ProofReferenceNo = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ProofTransactionAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DemurrageBillingsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_DemurrageBillingsSet_ContainerSizesSet_ContainerSizeId",
                    column: x => x.ContainerSizeId,
                    principalTable: "ContainerSizesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_DemurrageBillingsSet_ContainerTypesSet_ContainerTypeId",
                    column: x => x.ContainerTypeId,
                    principalTable: "ContainerTypesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_DemurrageBillingsSet_PreAdvicesSet_PreAdviceId",
                    column: x => x.PreAdviceId,
                    principalTable: "PreAdvicesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_DemurrageBillingsSet_ShippingLinesSet_ShippingLineId",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_DemurrageBillingsSet_UsersSet_TruckerId",
                    column: x => x.TruckerId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_ContainerNoNormalized_ShippingLineId_ContainerSizeId_ContainerTypeId",
            table: "DemurrageBillingsSet",
            columns: new[] { "ContainerNoNormalized", "ShippingLineId", "ContainerSizeId", "ContainerTypeId" });

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_ContainerSizeId",
            table: "DemurrageBillingsSet",
            column: "ContainerSizeId");

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_ContainerTypeId",
            table: "DemurrageBillingsSet",
            column: "ContainerTypeId");

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_PreAdviceId",
            table: "DemurrageBillingsSet",
            column: "PreAdviceId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_ReferenceNo",
            table: "DemurrageBillingsSet",
            column: "ReferenceNo",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_ShippingLineId",
            table: "DemurrageBillingsSet",
            column: "ShippingLineId");

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_TruckerId",
            table: "DemurrageBillingsSet",
            column: "TruckerId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "DemurrageBillingsSet");

        migrationBuilder.DropColumn(name: "DemurrageValidUntil", table: "PreAdvicesSet");
        migrationBuilder.DropColumn(name: "DemurrageFeeAmount", table: "PaymentSettingsSet");
        migrationBuilder.DropColumn(name: "DetentionFeeAmount", table: "PaymentSettingsSet");
    }
}
