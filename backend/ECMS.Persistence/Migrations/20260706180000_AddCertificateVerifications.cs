using System;
using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    [DbContext(typeof(EcmsDbContext))]
    [Migration("20260706180000_AddCertificateVerifications")]
    public partial class AddCertificateVerifications : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CertificateVerificationsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TokenHash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    WithdrawalRequestId = table.Column<int>(type: "int", nullable: false),
                    WithdrawalDocumentId = table.Column<int>(type: "int", nullable: false),
                    DocumentType = table.Column<int>(type: "int", nullable: false),
                    DocumentFingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AtwNumber = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReferenceNo = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ShippingLineName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IssuedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RevocationReason = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    VerificationCount = table.Column<int>(type: "int", nullable: false),
                    LastVerifiedAtUtc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CertificateVerificationsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CertVerif_WithdrawalDocumentId",
                        column: x => x.WithdrawalDocumentId,
                        principalTable: "WithdrawalDocumentsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CertVerif_WithdrawalRequestId",
                        column: x => x.WithdrawalRequestId,
                        principalTable: "WithdrawalRequestsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_CertificateVerificationsSet_TokenHash",
                table: "CertificateVerificationsSet",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CertificateVerificationsSet_WithdrawalDocumentId",
                table: "CertificateVerificationsSet",
                column: "WithdrawalDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_CertificateVerificationsSet_WithdrawalRequestId_RevokedAtUtc",
                table: "CertificateVerificationsSet",
                columns: new[] { "WithdrawalRequestId", "RevokedAtUtc" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "CertificateVerificationsSet");
        }
    }
}
