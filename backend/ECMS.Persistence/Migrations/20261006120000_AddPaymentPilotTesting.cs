using ECMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations;

[DbContext(typeof(EcmsDbContext))]
[Migration("20261006120000_AddPaymentPilotTesting")]
public partial class AddPaymentPilotTesting : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "PilotTestingEnabled",
            table: "PaymentSettingsSet",
            type: "tinyint(1)",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTime>(
            name: "PilotTestingEndsAtUtc",
            table: "PaymentSettingsSet",
            type: "datetime(6)",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "PilotTestingDurationDays",
            table: "PaymentSettingsSet",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<bool>(
            name: "PilotNotified3DaysBefore",
            table: "PaymentSettingsSet",
            type: "tinyint(1)",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "PilotNotified1DayBefore",
            table: "PaymentSettingsSet",
            type: "tinyint(1)",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "PilotTestingEnabled", table: "PaymentSettingsSet");
        migrationBuilder.DropColumn(name: "PilotTestingEndsAtUtc", table: "PaymentSettingsSet");
        migrationBuilder.DropColumn(name: "PilotTestingDurationDays", table: "PaymentSettingsSet");
        migrationBuilder.DropColumn(name: "PilotNotified3DaysBefore", table: "PaymentSettingsSet");
        migrationBuilder.DropColumn(name: "PilotNotified1DayBefore", table: "PaymentSettingsSet");
    }
}
