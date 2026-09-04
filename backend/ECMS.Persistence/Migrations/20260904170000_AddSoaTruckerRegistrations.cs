using System;
using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260904170000_AddSoaTruckerRegistrations")]
public partial class AddSoaTruckerRegistrations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SoaTruckerRegistrationsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                ShippingLineId = table.Column<int>(type: "int", nullable: false),
                TruckerId = table.Column<int>(type: "int", nullable: false),
                RegisteredByUserId = table.Column<int>(type: "int", nullable: false),
                RegisteredAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SoaTruckerRegistrationsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_SoaTruckerRegistrations_ShippingLines",
                    column: x => x.ShippingLineId,
                    principalTable: "ShippingLinesSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SoaTruckerRegistrations_Truckers",
                    column: x => x.TruckerId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_SoaTruckerRegistrations_RegisteredBy",
                    column: x => x.RegisteredByUserId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_SoaTruckerRegistrations_ShippingLineId_TruckerId",
            table: "SoaTruckerRegistrationsSet",
            columns: new[] { "ShippingLineId", "TruckerId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SoaTruckerRegistrationsSet");
    }
}
