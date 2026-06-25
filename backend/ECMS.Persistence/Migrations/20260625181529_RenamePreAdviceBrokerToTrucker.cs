using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ECMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenamePreAdviceBrokerToTrucker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                SET @fk_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND CONSTRAINT_NAME = 'FK_PreAdvicesSet_UsersSet_BrokerId'
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                );
                SET @sql = IF(
                    @fk_exists > 0,
                    'ALTER TABLE `PreAdvicesSet` DROP FOREIGN KEY `FK_PreAdvicesSet_UsersSet_BrokerId`',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.Sql("""
                SET @col_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND COLUMN_NAME = 'BrokerId'
                );
                SET @sql = IF(
                    @col_exists > 0,
                    'ALTER TABLE `PreAdvicesSet` CHANGE COLUMN `BrokerId` `TruckerId` int NOT NULL',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.Sql("""
                SET @idx_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND INDEX_NAME = 'IX_PreAdvicesSet_BrokerId'
                );
                SET @sql = IF(
                    @idx_exists > 0,
                    'ALTER TABLE `PreAdvicesSet` DROP INDEX `IX_PreAdvicesSet_BrokerId`',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.Sql("""
                SET @idx_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND INDEX_NAME = 'IX_PreAdvicesSet_TruckerId'
                );
                SET @sql = IF(
                    @idx_exists = 0,
                    'CREATE INDEX `IX_PreAdvicesSet_TruckerId` ON `PreAdvicesSet` (`TruckerId`)',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.AddForeignKey(
                name: "FK_PreAdvicesSet_UsersSet_TruckerId",
                table: "PreAdvicesSet",
                column: "TruckerId",
                principalTable: "UsersSet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PreAdvicesSet_UsersSet_TruckerId",
                table: "PreAdvicesSet");

            migrationBuilder.Sql("""
                SET @col_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND COLUMN_NAME = 'TruckerId'
                );
                SET @sql = IF(
                    @col_exists > 0,
                    'ALTER TABLE `PreAdvicesSet` CHANGE COLUMN `TruckerId` `BrokerId` int NOT NULL',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.Sql("""
                SET @idx_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND INDEX_NAME = 'IX_PreAdvicesSet_TruckerId'
                );
                SET @sql = IF(
                    @idx_exists > 0,
                    'ALTER TABLE `PreAdvicesSet` DROP INDEX `IX_PreAdvicesSet_TruckerId`',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.Sql("""
                SET @idx_exists = (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'PreAdvicesSet'
                      AND INDEX_NAME = 'IX_PreAdvicesSet_BrokerId'
                );
                SET @sql = IF(
                    @idx_exists = 0,
                    'CREATE INDEX `IX_PreAdvicesSet_BrokerId` ON `PreAdvicesSet` (`BrokerId`)',
                    'SELECT 1'
                );
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                """);

            migrationBuilder.AddForeignKey(
                name: "FK_PreAdvicesSet_UsersSet_BrokerId",
                table: "PreAdvicesSet",
                column: "BrokerId",
                principalTable: "UsersSet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
