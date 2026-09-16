-- Idempotent schema for CY fill priority + depot hourly capacity (2026-09-16).
-- Safe to run multiple times in phpMyAdmin or via migrate-production-via-ssh.ps1.

SET @db := DATABASE();

-- DepotsSet.ContainersPerHour
SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'DepotsSet' AND COLUMN_NAME = 'ContainersPerHour'
        ),
        'SELECT 1',
        'ALTER TABLE `DepotsSet` ADD `ContainersPerHour` int NOT NULL DEFAULT 3'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260916100000_AddDepotContainersPerHour', '7.0.20');

-- ShippingLinesSet.CyFillStrategy
SET @sql := (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ShippingLinesSet' AND COLUMN_NAME = 'CyFillStrategy'
        ),
        'SELECT 1',
        'ALTER TABLE `ShippingLinesSet` ADD `CyFillStrategy` int NOT NULL DEFAULT 0'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `ShippingLineDepotFillPrioritiesSet` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ShippingLineId` int NOT NULL,
    `DepotId` int NOT NULL,
    `SortOrder` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_SLDepotFillPriorities_ShippingLineId_DepotId` (`ShippingLineId`, `DepotId`),
    KEY `IX_SLDepotFillPriorities_ShippingLineId_SortOrder` (`ShippingLineId`, `SortOrder`),
    KEY `IX_SLDepotFillPriorities_DepotId` (`DepotId`),
    CONSTRAINT `FK_SLDepotFillPriorities_DepotId`
        FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_SLDepotFillPriorities_ShippingLineId`
        FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ShippingLineDailyDepotFillsSet` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ShippingLineId` int NOT NULL,
    `EffectiveDate` date NOT NULL,
    `PrimaryDepotId` int NOT NULL,
    `SetByUserId` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `IX_SLDailyDepotFills_ShippingLineId_EffectiveDate` (`ShippingLineId`, `EffectiveDate`),
    KEY `IX_SLDailyDepotFills_PrimaryDepotId` (`PrimaryDepotId`),
    KEY `IX_SLDailyDepotFills_SetByUserId` (`SetByUserId`),
    CONSTRAINT `FK_SLDailyDepotFills_DepotId`
        FOREIGN KEY (`PrimaryDepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_SLDailyDepotFills_SetByUserId`
        FOREIGN KEY (`SetByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_SLDailyDepotFills_ShippingLineId`
        FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260916110000_AddShippingLineCyFillControl', '7.0.20');
