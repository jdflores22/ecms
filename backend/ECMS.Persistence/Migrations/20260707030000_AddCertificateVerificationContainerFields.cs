using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260707030000_AddCertificateVerificationContainerFields")]
public partial class AddCertificateVerificationContainerFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ContainerNo",
            table: "CertificateVerificationsSet",
            type: "varchar(64)",
            maxLength: 64,
            nullable: false,
            defaultValue: "")
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "ContainerSize",
            table: "CertificateVerificationsSet",
            type: "varchar(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "")
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "ContainerType",
            table: "CertificateVerificationsSet",
            type: "varchar(32)",
            maxLength: 32,
            nullable: false,
            defaultValue: "")
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "Destination",
            table: "CertificateVerificationsSet",
            type: "varchar(256)",
            maxLength: 256,
            nullable: false,
            defaultValue: "")
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<int>(
            name: "WithdrawalRequestLineId",
            table: "CertificateVerificationsSet",
            type: "int",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "ContainerNo", table: "CertificateVerificationsSet");
        migrationBuilder.DropColumn(name: "ContainerSize", table: "CertificateVerificationsSet");
        migrationBuilder.DropColumn(name: "ContainerType", table: "CertificateVerificationsSet");
        migrationBuilder.DropColumn(name: "Destination", table: "CertificateVerificationsSet");
        migrationBuilder.DropColumn(name: "WithdrawalRequestLineId", table: "CertificateVerificationsSet");
    }
}
