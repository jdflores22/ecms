using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleAllowedPages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AllowedPagesJson",
                table: "RolesSet",
                type: "longtext",
                nullable: false,
                defaultValue: "[]")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowedPagesJson",
                table: "RolesSet");
        }
    }
}
