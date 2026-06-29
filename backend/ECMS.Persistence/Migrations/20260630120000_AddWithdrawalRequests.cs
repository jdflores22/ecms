using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260630120000_AddWithdrawalRequests")]
public partial class AddWithdrawalRequests : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "WithdrawalRequestsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ReferenceNo = table.Column<string>(type: "varchar(255)", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                AtwNumber = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                TruckerId = table.Column<int>(type: "int", nullable: false),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                ContainerId = table.Column<int>(type: "int", nullable: false),
                ContainerNoNormalized = table.Column<string>(type: "varchar(255)", nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ContainerSizeId = table.Column<int>(type: "int", nullable: false),
                ContainerTypeId = table.Column<int>(type: "int", nullable: false),
                CurrentDepotId = table.Column<int>(type: "int", nullable: false),
                Destination = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                IssueDate = table.Column<DateOnly>(type: "date", nullable: false),
                ExpirationDate = table.Column<DateOnly>(type: "date", nullable: false),
                Purpose = table.Column<int>(type: "int", nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                Remarks = table.Column<string>(type: "longtext", nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ActiveRequestKey = table.Column<string>(type: "varchar(255)", nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                SubmittedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_WithdrawalRequestsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestsSet_ContainersSet_ContainerId",
                    column: x => x.ContainerId,
                    principalTable: "ContainersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestsSet_ContainerSizesSet_ContainerSizeId",
                    column: x => x.ContainerSizeId,
                    principalTable: "ContainerSizesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestsSet_ContainerTypesSet_ContainerTypeId",
                    column: x => x.ContainerTypeId,
                    principalTable: "ContainerTypesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestsSet_DepotsSet_CurrentDepotId",
                    column: x => x.CurrentDepotId,
                    principalTable: "DepotsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestsSet_ShippingLinesSet_ShippingLineId",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalRequestsSet_UsersSet_TruckerId",
                    column: x => x.TruckerId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "WithdrawalDocumentsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                WithdrawalRequestId = table.Column<int>(type: "int", nullable: false),
                DocumentType = table.Column<int>(type: "int", nullable: false),
                FileName = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                FilePath = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ContentType = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                FileSize = table.Column<long>(type: "bigint", nullable: false),
                UploadedById = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_WithdrawalDocumentsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_WithdrawalDocumentsSet_UsersSet_UploadedById",
                    column: x => x.UploadedById,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_WithdrawalDocumentsSet_WithdrawalRequestsSet_WithdrawalRequestId",
                    column: x => x.WithdrawalRequestId,
                    principalTable: "WithdrawalRequestsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalDocumentsSet_UploadedById",
            table: "WithdrawalDocumentsSet",
            column: "UploadedById");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalDocumentsSet_WithdrawalRequestId_DocumentType",
            table: "WithdrawalDocumentsSet",
            columns: new[] { "WithdrawalRequestId", "DocumentType" });

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
            name: "IX_WithdrawalRequestsSet_ContainerNoNormalized_ContainerSizeId_ContainerTypeId",
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

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_CurrentDepotId_Status",
            table: "WithdrawalRequestsSet",
            columns: new[] { "CurrentDepotId", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ReferenceNo",
            table: "WithdrawalRequestsSet",
            column: "ReferenceNo",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_ShippingLineId",
            table: "WithdrawalRequestsSet",
            column: "ShippingLineId");

        migrationBuilder.CreateIndex(
            name: "IX_WithdrawalRequestsSet_TruckerId_CreatedAt",
            table: "WithdrawalRequestsSet",
            columns: new[] { "TruckerId", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "WithdrawalDocumentsSet");
        migrationBuilder.DropTable(name: "WithdrawalRequestsSet");
    }
}
