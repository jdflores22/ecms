using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "DepotsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Address = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepotsSet", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RolesSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolesSet", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ShippingLinesSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Code = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingLinesSet", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ContainersSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ContainerNo = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Size = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ShippingLineId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContainersSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContainersSet_ShippingLinesSet_ShippingLineId",
                        column: x => x.ShippingLineId,
                        principalTable: "ShippingLinesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "UsersSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Username = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PasswordHash = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    FullName = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ShippingLineId = table.Column<int>(type: "int", nullable: true),
                    DepotId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsersSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsersSet_DepotsSet_DepotId",
                        column: x => x.DepotId,
                        principalTable: "DepotsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UsersSet_RolesSet_RoleId",
                        column: x => x.RoleId,
                        principalTable: "RolesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsersSet_ShippingLinesSet_ShippingLineId",
                        column: x => x.ShippingLineId,
                        principalTable: "ShippingLinesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AuditLogsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Module = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Details = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogsSet_UsersSet_UserId",
                        column: x => x.UserId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PreAdvicesSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ReferenceNo = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BrokerId = table.Column<int>(type: "int", nullable: false),
                    ShippingLineId = table.Column<int>(type: "int", nullable: false),
                    ContainerId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreAdvicesSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreAdvicesSet_ContainersSet_ContainerId",
                        column: x => x.ContainerId,
                        principalTable: "ContainersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreAdvicesSet_ShippingLinesSet_ShippingLineId",
                        column: x => x.ShippingLineId,
                        principalTable: "ShippingLinesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreAdvicesSet_UsersSet_BrokerId",
                        column: x => x.BrokerId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RefreshTokensSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Token = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    IsRevoked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokensSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokensSet_UsersSet_UserId",
                        column: x => x.UserId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "EvaluationsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PreAdviceId = table.Column<int>(type: "int", nullable: false),
                    EvaluatorId = table.Column<int>(type: "int", nullable: false),
                    DepotId = table.Column<int>(type: "int", nullable: true),
                    Remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    EvaluatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvaluationsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EvaluationsSet_DepotsSet_DepotId",
                        column: x => x.DepotId,
                        principalTable: "DepotsSet",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EvaluationsSet_PreAdvicesSet_PreAdviceId",
                        column: x => x.PreAdviceId,
                        principalTable: "PreAdvicesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EvaluationsSet_UsersSet_EvaluatorId",
                        column: x => x.EvaluatorId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "SchedulesSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PreAdviceId = table.Column<int>(type: "int", nullable: false),
                    DepotId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Time = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    SlotNo = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TruckerId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchedulesSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchedulesSet_DepotsSet_DepotId",
                        column: x => x.DepotId,
                        principalTable: "DepotsSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SchedulesSet_PreAdvicesSet_PreAdviceId",
                        column: x => x.PreAdviceId,
                        principalTable: "PreAdvicesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SchedulesSet_UsersSet_TruckerId",
                        column: x => x.TruckerId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PaymentsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ScheduleId = table.Column<int>(type: "int", nullable: false),
                    TruckerId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    ProofFile = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentsSet_SchedulesSet_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "SchedulesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PaymentsSet_UsersSet_TruckerId",
                        column: x => x.TruckerId,
                        principalTable: "UsersSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "QRBookingsSet",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ScheduleId = table.Column<int>(type: "int", nullable: false),
                    QRCode = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PayloadJson = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    GeneratedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    IsUsed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QRBookingsSet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QRBookingsSet_SchedulesSet_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "SchedulesSet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogsSet_UserId",
                table: "AuditLogsSet",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ContainersSet_ContainerNo",
                table: "ContainersSet",
                column: "ContainerNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContainersSet_ShippingLineId",
                table: "ContainersSet",
                column: "ShippingLineId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationsSet_DepotId",
                table: "EvaluationsSet",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationsSet_EvaluatorId",
                table: "EvaluationsSet",
                column: "EvaluatorId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationsSet_PreAdviceId",
                table: "EvaluationsSet",
                column: "PreAdviceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentsSet_ScheduleId",
                table: "PaymentsSet",
                column: "ScheduleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentsSet_TruckerId",
                table: "PaymentsSet",
                column: "TruckerId");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_BrokerId",
                table: "PreAdvicesSet",
                column: "BrokerId");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ContainerId",
                table: "PreAdvicesSet",
                column: "ContainerId");

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ReferenceNo",
                table: "PreAdvicesSet",
                column: "ReferenceNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreAdvicesSet_ShippingLineId",
                table: "PreAdvicesSet",
                column: "ShippingLineId");

            migrationBuilder.CreateIndex(
                name: "IX_QRBookingsSet_QRCode",
                table: "QRBookingsSet",
                column: "QRCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QRBookingsSet_ScheduleId",
                table: "QRBookingsSet",
                column: "ScheduleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokensSet_Token",
                table: "RefreshTokensSet",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokensSet_UserId",
                table: "RefreshTokensSet",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RolesSet_Name",
                table: "RolesSet",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchedulesSet_DepotId",
                table: "SchedulesSet",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_SchedulesSet_PreAdviceId",
                table: "SchedulesSet",
                column: "PreAdviceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchedulesSet_TruckerId",
                table: "SchedulesSet",
                column: "TruckerId");

            migrationBuilder.CreateIndex(
                name: "IX_ShippingLinesSet_Code",
                table: "ShippingLinesSet",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsersSet_DepotId",
                table: "UsersSet",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_UsersSet_Email",
                table: "UsersSet",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsersSet_RoleId",
                table: "UsersSet",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UsersSet_ShippingLineId",
                table: "UsersSet",
                column: "ShippingLineId");

            migrationBuilder.CreateIndex(
                name: "IX_UsersSet_Username",
                table: "UsersSet",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogsSet");

            migrationBuilder.DropTable(
                name: "EvaluationsSet");

            migrationBuilder.DropTable(
                name: "PaymentsSet");

            migrationBuilder.DropTable(
                name: "QRBookingsSet");

            migrationBuilder.DropTable(
                name: "RefreshTokensSet");

            migrationBuilder.DropTable(
                name: "SchedulesSet");

            migrationBuilder.DropTable(
                name: "PreAdvicesSet");

            migrationBuilder.DropTable(
                name: "ContainersSet");

            migrationBuilder.DropTable(
                name: "UsersSet");

            migrationBuilder.DropTable(
                name: "DepotsSet");

            migrationBuilder.DropTable(
                name: "RolesSet");

            migrationBuilder.DropTable(
                name: "ShippingLinesSet");
        }
    }
}
