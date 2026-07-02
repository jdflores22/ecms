using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260701140000_AddPaymentProofQrphInvoiceNo")]
public partial class AddPaymentProofQrphInvoiceNo : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ProofQrphInvoiceNo",
            table: "PaymentsSet",
            type: "varchar(32)",
            maxLength: 32,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ProofQrphInvoiceNo",
            table: "PaymentsSet");
    }
}
