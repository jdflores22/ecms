using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

public partial class AddYardInventoryReleaseStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "YardStatus",
            table: "ManualYardInventoryEntriesSet",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<DateTime>(
            name: "ReleasedAt",
            table: "ManualYardInventoryEntriesSet",
            type: "datetime(6)",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "ReleasedWithdrawalRequestId",
            table: "ManualYardInventoryEntriesSet",
            type: "int",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "ReleasedWithdrawalLineId",
            table: "ManualYardInventoryEntriesSet",
            type: "int",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "ReleasedAt",
            table: "WithdrawalRequestLinesSet",
            type: "datetime(6)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "YardStatus",
            table: "ManualYardInventoryEntriesSet");

        migrationBuilder.DropColumn(
            name: "ReleasedAt",
            table: "ManualYardInventoryEntriesSet");

        migrationBuilder.DropColumn(
            name: "ReleasedWithdrawalRequestId",
            table: "ManualYardInventoryEntriesSet");

        migrationBuilder.DropColumn(
            name: "ReleasedWithdrawalLineId",
            table: "ManualYardInventoryEntriesSet");

        migrationBuilder.DropColumn(
            name: "ReleasedAt",
            table: "WithdrawalRequestLinesSet");
    }
}
