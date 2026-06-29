-- Direct ATW schema for Hostinger / phpMyAdmin (no DELIMITER / stored procedures).
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and INSERT IGNORE.

CREATE TABLE IF NOT EXISTS `WithdrawalRequestsSet` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `ReferenceNo` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `AtwNumber` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `TruckerId` int NOT NULL,
    `ShippingLineId` int NOT NULL,
    `CurrentDepotId` int NOT NULL,
    `Destination` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
    `IssueDate` date NOT NULL,
    `ExpirationDate` date NOT NULL,
    `Purpose` int NOT NULL,
    `Status` int NOT NULL,
    `Remarks` longtext CHARACTER SET utf8mb4 NULL,
    `ReviewRemarks` longtext CHARACTER SET utf8mb4 NULL,
    `SubmittedAt` datetime(6) NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_WithdrawalRequestsSet` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_WithdrawalRequestsSet_UsersSet_TruckerId` FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_WithdrawalRequestsSet_ShippingLinesSet_ShippingLineId` FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_WithdrawalRequestsSet_DepotsSet_CurrentDepotId` FOREIGN KEY (`CurrentDepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `WithdrawalRequestLinesSet` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `WithdrawalRequestId` int NOT NULL,
    `LineNo` int NOT NULL,
    `ContainerId` int NOT NULL,
    `ContainerNoNormalized` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `ContainerSizeId` int NOT NULL,
    `ContainerTypeId` int NOT NULL,
    `ActiveRequestKey` varchar(255) CHARACTER SET utf8mb4 NULL,
    `LineStatus` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_WithdrawalRequestLinesSet` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_WRL_WithdrawalRequestsSet` FOREIGN KEY (`WithdrawalRequestId`) REFERENCES `WithdrawalRequestsSet` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_WRL_ContainersSet` FOREIGN KEY (`ContainerId`) REFERENCES `ContainersSet` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_WRL_ContainerSizesSet` FOREIGN KEY (`ContainerSizeId`) REFERENCES `ContainerSizesSet` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_WRL_ContainerTypesSet` FOREIGN KEY (`ContainerTypeId`) REFERENCES `ContainerTypesSet` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `WithdrawalDocumentsSet` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `WithdrawalRequestId` int NOT NULL,
    `DocumentType` int NOT NULL,
    `FileName` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
    `FilePath` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
    `ContentType` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `FileSize` bigint NOT NULL,
    `UploadedById` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_WithdrawalDocumentsSet` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_WD_WithdrawalRequestsSet` FOREIGN KEY (`WithdrawalRequestId`) REFERENCES `WithdrawalRequestsSet` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_WD_UsersSet_UploadedById` FOREIGN KEY (`UploadedById`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- Indexes (ignore errors if they already exist)
SET @db := DATABASE();

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestsSet' AND index_name = 'IX_WithdrawalRequestsSet_ReferenceNo') = 0,
    'CREATE UNIQUE INDEX `IX_WithdrawalRequestsSet_ReferenceNo` ON `WithdrawalRequestsSet` (`ReferenceNo`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestsSet' AND index_name = 'IX_WithdrawalRequestsSet_TruckerId_CreatedAt') = 0,
    'CREATE INDEX `IX_WithdrawalRequestsSet_TruckerId_CreatedAt` ON `WithdrawalRequestsSet` (`TruckerId`, `CreatedAt`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestsSet' AND index_name = 'IX_WithdrawalRequestsSet_CurrentDepotId_Status') = 0,
    'CREATE INDEX `IX_WithdrawalRequestsSet_CurrentDepotId_Status` ON `WithdrawalRequestsSet` (`CurrentDepotId`, `Status`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestsSet' AND index_name = 'IX_WithdrawalRequestsSet_ShippingLineId') = 0,
    'CREATE INDEX `IX_WithdrawalRequestsSet_ShippingLineId` ON `WithdrawalRequestsSet` (`ShippingLineId`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestLinesSet' AND index_name = 'IX_WRL_ActiveRequestKey') = 0,
    'CREATE UNIQUE INDEX `IX_WRL_ActiveRequestKey` ON `WithdrawalRequestLinesSet` (`ActiveRequestKey`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestLinesSet' AND index_name = 'IX_WRL_RequestId_LineNo') = 0,
    'CREATE UNIQUE INDEX `IX_WRL_RequestId_LineNo` ON `WithdrawalRequestLinesSet` (`WithdrawalRequestId`, `LineNo`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalRequestLinesSet' AND index_name = 'IX_WRL_ContainerNo_Size_Type') = 0,
    'CREATE INDEX `IX_WRL_ContainerNo_Size_Type` ON `WithdrawalRequestLinesSet` (`ContainerNoNormalized`, `ContainerSizeId`, `ContainerTypeId`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'WithdrawalDocumentsSet' AND index_name = 'IX_WithdrawalDocumentsSet_WithdrawalRequestId_DocumentType') = 0,
    'CREATE INDEX `IX_WithdrawalDocumentsSet_WithdrawalRequestId_DocumentType` ON `WithdrawalDocumentsSet` (`WithdrawalRequestId`, `DocumentType`)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`) VALUES
    ('20260630120000_AddWithdrawalRequests', '7.0.20'),
    ('20260630140000_AddWithdrawalReviewRemarks', '7.0.20'),
    ('20260630160000_AddWithdrawalRequestLines', '7.0.20');
