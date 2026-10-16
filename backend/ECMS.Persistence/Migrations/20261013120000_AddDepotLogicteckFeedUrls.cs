using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261013120000_AddDepotLogicteckFeedUrls")]
public partial class AddDepotLogicteckFeedUrls : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "LogicteckAllocationsUrl",
            table: "DepotsSet",
            type: "varchar(512)",
            maxLength: 512,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "LogicteckBookingsUrl",
            table: "DepotsSet",
            type: "varchar(512)",
            maxLength: 512,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "LogicteckIcsBaseUrl",
            table: "DepotsSet",
            type: "varchar(512)",
            maxLength: 512,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "LogicteckInventoryUrl",
            table: "DepotsSet",
            type: "varchar(512)",
            maxLength: 512,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<string>(
            name: "LogicteckFeedCode",
            table: "ShippingLinesSet",
            type: "varchar(40)",
            maxLength: 40,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "LogicteckAllocationsUrl", table: "DepotsSet");
        migrationBuilder.DropColumn(name: "LogicteckBookingsUrl", table: "DepotsSet");
        migrationBuilder.DropColumn(name: "LogicteckIcsBaseUrl", table: "DepotsSet");
        migrationBuilder.DropColumn(name: "LogicteckInventoryUrl", table: "DepotsSet");
        migrationBuilder.DropColumn(name: "LogicteckFeedCode", table: "ShippingLinesSet");
    }
}
