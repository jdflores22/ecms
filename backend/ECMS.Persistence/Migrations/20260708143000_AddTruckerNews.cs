using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20260708143000_AddTruckerNews")]
public partial class AddTruckerNews : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "TruckerNewsSet",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                Title = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                Body = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: false)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ImagePath = table.Column<string>(type: "varchar(512)", maxLength: 512, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ImageFileName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ImageContentType = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true)
                    .Annotation("MySql:CharSet", "utf8mb4"),
                ImageFileSize = table.Column<long>(type: "bigint", nullable: true),
                IsPublished = table.Column<bool>(type: "tinyint(1)", nullable: false),
                PublishedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TruckerNewsSet", x => x.Id);
                table.ForeignKey(
                    name: "FK_TruckerNews_CreatedByUserId",
                    column: x => x.CreatedByUserId,
                    principalTable: "UsersSet",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            })
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_TruckerNewsSet_IsPublished_PublishedAt",
            table: "TruckerNewsSet",
            columns: new[] { "IsPublished", "PublishedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "TruckerNewsSet");
    }
}
