using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContainerSizeTeu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Teu",
                table: "ContainerSizesSet",
                type: "decimal(65,30)",
                nullable: false,
                defaultValue: 2m);

            migrationBuilder.Sql("UPDATE `ContainerSizesSet` SET `Teu` = 1 WHERE `Label` = '20'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Teu",
                table: "ContainerSizesSet");
        }
    }
}
