using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPreAdviceDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PreAdviceDocumentsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PreAdviceId = table.Column<int>(type: "int", nullable: false),
                    FileName = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FilePath = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ContentType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedById = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreAdviceDocumentsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreAdviceDocumentsSet_PreAdvicesSet_PreAdviceId",
                        column: x => x.PreAdviceId,
                        principalTable: "PreAdvicesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreAdviceDocumentsSet_UsersSet_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdviceDocumentsSet_PreAdviceId",
                table: "PreAdviceDocumentsSet",
                column: "PreAdviceId");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdviceDocumentsSet_UploadedById",
                table: "PreAdviceDocumentsSet",
                column: "UploadedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreAdviceDocumentsSet");
        }
    }
}
