using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260707040000_AddDepotBroadcasts")]
public partial class AddDepotBroadcasts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DepotBroadcastsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                DepotId = table.Column<int>(type: "int", nullable: false),
                Subject = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                Message = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                RecipientCount = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DepotBroadcastsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_DepotBroadcasts_DepotId",
                    column: x => x.DepotId,
                    principalTable: "DepotsSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_DepotBroadcasts_CreatedByUserId",
                    column: x => x.CreatedByUserId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_DepotBroadcastsSet_DepotId_CreatedAt",
            table: "DepotBroadcastsSet",
            columns: new[] { "DepotId", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "DepotBroadcastsSet");
    }
}
