using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260707020000_AddCertificateVerificationTruckerName")]
public partial class AddCertificateVerificationTruckerName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TruckerName",
            table: "CertificateVerificationsSet",
            type: "varchar(256)",
            maxLength: 256,
            nullable: false,
            defaultValue: "")
            .Annotation("MySql:CharSet", "utf8mb4");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "TruckerName", table: "CertificateVerificationsSet");
    }
}
