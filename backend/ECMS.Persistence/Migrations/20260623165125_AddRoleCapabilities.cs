using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleCapabilities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CapabilitiesJson",
                table: "RolesSet",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "RolesSet",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Label",
                table: "RolesSet",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CapabilitiesJson",
                table: "RolesSet");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "RolesSet");

            migrationBuilder.DropColumn(
                name: "Label",
                table: "RolesSet");
        }
    }
}
