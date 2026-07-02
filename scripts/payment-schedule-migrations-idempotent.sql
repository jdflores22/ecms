-- Idempotent schema repair for payment proof + schedule depot remarks columns.
-- Import in phpMyAdmin if trucker/mobile API endpoints return HTTP 500 after deploy.
-- Safe to run multiple times.

START TRANSACTION;

DROP PROCEDURE IF EXISTS EcmsAddColumnIfMissing;
DELIMITER //
CREATE PROCEDURE EcmsAddColumnIfMissing(
    IN p_table VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_definition TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table
          AND COLUMN_NAME = p_column)
    THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD `', p_column, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL EcmsAddColumnIfMissing('PaymentsSet', 'ProofProvider', 'varchar(32) CHARACTER SET utf8mb4 NULL');
CALL EcmsAddColumnIfMissing('PaymentsSet', 'ProofQrphInvoiceNo', 'varchar(32) CHARACTER SET utf8mb4 NULL');
CALL EcmsAddColumnIfMissing('SchedulesSet', 'DepotRemarks', 'longtext CHARACTER SET utf8mb4 NULL');

DROP PROCEDURE IF EXISTS EcmsAddColumnIfMissing;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260701120000_AddPaymentProofProvider', '7.0.20');

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260701140000_AddPaymentProofQrphInvoiceNo', '7.0.20');

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260701160000_AddScheduleDepotRemarks', '7.0.20');

COMMIT;
