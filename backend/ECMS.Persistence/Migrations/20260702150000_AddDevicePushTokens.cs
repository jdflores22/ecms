using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260702150000_AddDevicePushTokens")]
public partial class AddDevicePushTokens : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DevicePushTokensSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                UserId = table.Column<int>(type: "int", nullable: false),
                Token = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: false),
                Platform = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                DeviceName = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true),
                UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DevicePushTokensSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_DevicePushTokensSet_UsersSet_UserId",
                    column: x => x.UserId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_DevicePushTokensSet_Token",
            table: "DevicePushTokensSet",
            column: "Token",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_DevicePushTokensSet_UserId_UpdatedAt",
            table: "DevicePushTokensSet",
            columns: new[] { "UserId", "UpdatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "DevicePushTokensSet");
    }
}
