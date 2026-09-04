using System;
using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260904140000_AddStatementOfAccounts")]
public partial class AddStatementOfAccounts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "StatementOfAccountId",
            table: "DemurrageBillingsSet",
            type: "int",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "ShippingLineCreditLinesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                CreditLimit = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                UtilizedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ShippingLineCreditLinesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_ShippingLineCreditLines_ShippingLines",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "StatementOfAccountsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ReferenceNo = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                TruckerId = table.Column<int>(type: "int", nullable: false),
                PeriodFrom = table.Column<DateOnly>(type: "date", nullable: true),
                PeriodTo = table.Column<DateOnly>(type: "date", nullable: true),
                Status = table.Column<int>(type: "int", nullable: false),
                TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                CreditApplied = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                AmountDue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                IssuedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                IssuedByUserId = table.Column<int>(type: "int", nullable: true),
                Remarks = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ProofFile = table.Column<string>(type: "longtext", nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ProofReferenceNo = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ProofTransactionAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StatementOfAccountsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_StatementOfAccounts_ShippingLines",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_StatementOfAccounts_Truckers",
                    column: x => x.TruckerId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_StatementOfAccounts_IssuedBy",
                    column: x => x.IssuedByUserId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "StatementOfAccountLinesSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                StatementOfAccountId = table.Column<int>(type: "int", nullable: false),
                DemurrageBillingId = table.Column<int>(type: "int", nullable: false),
                Description = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                SortOrder = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StatementOfAccountLinesSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_StatementOfAccountLines_SOA",
                    column: x => x.StatementOfAccountId,
                    principalTable: "StatementOfAccountsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_StatementOfAccountLines_DemurrageBilling",
                    column: x => x.DemurrageBillingId,
                    principalTable: "DemurrageBillingsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_DemurrageBillingsSet_StatementOfAccountId",
            table: "DemurrageBillingsSet",
            column: "StatementOfAccountId");

        migrationBuilder.CreateIndex(
            name: "IX_ShippingLineCreditLinesSet_ShippingLineId",
            table: "ShippingLineCreditLinesSet",
            column: "ShippingLineId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_StatementOfAccountsSet_ReferenceNo",
            table: "StatementOfAccountsSet",
            column: "ReferenceNo",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_StatementOfAccountsSet_ShippingLineId_TruckerId_Status",
            table: "StatementOfAccountsSet",
            columns: new[] { "ShippingLineId", "TruckerId", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_StatementOfAccountsSet_IssuedByUserId",
            table: "StatementOfAccountsSet",
            column: "IssuedByUserId");

        migrationBuilder.CreateIndex(
            name: "IX_StatementOfAccountLinesSet_DemurrageBillingId",
            table: "StatementOfAccountLinesSet",
            column: "DemurrageBillingId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_StatementOfAccountLinesSet_StatementOfAccountId",
            table: "StatementOfAccountLinesSet",
            column: "StatementOfAccountId");

        migrationBuilder.AddForeignKey(
            name: "FK_DemurrageBillings_StatementOfAccounts",
            table: "DemurrageBillingsSet",
            column: "StatementOfAccountId",
            principalTable: "StatementOfAccountsSet",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_DemurrageBillings_StatementOfAccounts",
            table: "DemurrageBillingsSet");

        migrationBuilder.DropTable(name: "StatementOfAccountLinesSet");
        migrationBuilder.DropTable(name: "StatementOfAccountsSet");
        migrationBuilder.DropTable(name: "ShippingLineCreditLinesSet");

        migrationBuilder.DropIndex(
            name: "IX_DemurrageBillingsSet_StatementOfAccountId",
            table: "DemurrageBillingsSet");

        migrationBuilder.DropColumn(
            name: "StatementOfAccountId",
            table: "DemurrageBillingsSet");
    }
}
