using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContainerPhotoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "PreAdviceDocumentsSet",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Comment",
                table: "PreAdviceDocumentsSet",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "PreAdviceDocumentsSet");

            migrationBuilder.DropColumn(
                name: "Comment",
                table: "PreAdviceDocumentsSet");
        }
    }
}
