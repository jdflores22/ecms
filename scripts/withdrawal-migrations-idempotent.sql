START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE TABLE `WithdrawalRequestsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ReferenceNo` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `AtwNumber` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
        `TruckerId` int NOT NULL,
        `ShippingLineId` int NOT NULL,
        `ContainerId` int NOT NULL,
        `ContainerNoNormalized` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `ContainerSizeId` int NOT NULL,
        `ContainerTypeId` int NOT NULL,
        `CurrentDepotId` int NOT NULL,
        `Destination` varchar(512) CHARACTER SET utf8mb4 NOT NULL,
        `IssueDate` date NOT NULL,
        `ExpirationDate` date NOT NULL,
        `Purpose` int NOT NULL,
        `Status` int NOT NULL,
        `Remarks` longtext CHARACTER SET utf8mb4 NULL,
        `ActiveRequestKey` varchar(255) CHARACTER SET utf8mb4 NULL,
        `SubmittedAt` datetime(6) NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_WithdrawalRequestsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_WithdrawalRequestsSet_ContainersSet_ContainerId` FOREIGN KEY (`ContainerId`) REFERENCES `ContainersSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestsSet_ContainerSizesSet_ContainerSizeId` FOREIGN KEY (`ContainerSizeId`) REFERENCES `ContainerSizesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestsSet_ContainerTypesSet_ContainerTypeId` FOREIGN KEY (`ContainerTypeId`) REFERENCES `ContainerTypesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestsSet_DepotsSet_CurrentDepotId` FOREIGN KEY (`CurrentDepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestsSet_ShippingLinesSet_ShippingLineId` FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestsSet_UsersSet_TruckerId` FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
    );

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE TABLE `WithdrawalDocumentsSet` (
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
        CONSTRAINT `FK_WithdrawalDocumentsSet_UsersSet_UploadedById` FOREIGN KEY (`UploadedById`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalDocumentsSet_WithdrawalRequestsSet_WithdrawalReques` FOREIGN KEY (`WithdrawalRequestId`) REFERENCES `WithdrawalRequestsSet` (`Id`) ON DELETE CASCADE
    );

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalDocumentsSet_UploadedById` ON `WithdrawalDocumentsSet` (`UploadedById`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalDocumentsSet_WithdrawalRequestId_DocumentType` ON `WithdrawalDocumentsSet` (`WithdrawalRequestId`, `DocumentType`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE UNIQUE INDEX `IX_WithdrawalRequestsSet_ActiveRequestKey` ON `WithdrawalRequestsSet` (`ActiveRequestKey`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalRequestsSet_ContainerId` ON `WithdrawalRequestsSet` (`ContainerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WR_ContainerNo_Size_Type` ON `WithdrawalRequestsSet` (`ContainerNoNormalized`, `ContainerSizeId`, `ContainerTypeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalRequestsSet_ContainerSizeId` ON `WithdrawalRequestsSet` (`ContainerSizeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalRequestsSet_ContainerTypeId` ON `WithdrawalRequestsSet` (`ContainerTypeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalRequestsSet_CurrentDepotId_Status` ON `WithdrawalRequestsSet` (`CurrentDepotId`, `Status`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE UNIQUE INDEX `IX_WithdrawalRequestsSet_ReferenceNo` ON `WithdrawalRequestsSet` (`ReferenceNo`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalRequestsSet_ShippingLineId` ON `WithdrawalRequestsSet` (`ShippingLineId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    CREATE INDEX `IX_WithdrawalRequestsSet_TruckerId_CreatedAt` ON `WithdrawalRequestsSet` (`TruckerId`, `CreatedAt`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630120000_AddWithdrawalRequests') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630120000_AddWithdrawalRequests', '7.0.20');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630140000_AddWithdrawalReviewRemarks') THEN

    ALTER TABLE `WithdrawalRequestsSet` ADD `ReviewRemarks` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630140000_AddWithdrawalReviewRemarks') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630140000_AddWithdrawalReviewRemarks', '7.0.20');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE TABLE `WithdrawalRequestLinesSet` (
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
        CONSTRAINT `FK_WithdrawalRequestLinesSet_ContainersSet_ContainerId` FOREIGN KEY (`ContainerId`) REFERENCES `ContainersSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestLinesSet_ContainerSizesSet_ContainerSizeId` FOREIGN KEY (`ContainerSizeId`) REFERENCES `ContainerSizesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestLinesSet_ContainerTypesSet_ContainerTypeId` FOREIGN KEY (`ContainerTypeId`) REFERENCES `ContainerTypesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_WithdrawalRequestLinesSet_WithdrawalRequestsSet_WithdrawalReq` FOREIGN KEY (`WithdrawalRequestId`) REFERENCES `WithdrawalRequestsSet` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    INSERT INTO WithdrawalRequestLinesSet
        (WithdrawalRequestId, LineNo, ContainerId, ContainerNoNormalized, ContainerSizeId, ContainerTypeId, ActiveRequestKey, LineStatus, CreatedAt)
    SELECT
        Id,
        1,
        ContainerId,
        ContainerNoNormalized,
        ContainerSizeId,
        ContainerTypeId,
        ActiveRequestKey,
        CASE Status
            WHEN 4 THEN 1
            WHEN 5 THEN 2
            WHEN 6 THEN 3
            ELSE 0
        END,
        CreatedAt
    FROM WithdrawalRequestsSet
    WHERE ContainerId IS NOT NULL AND ContainerId > 0

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP FOREIGN KEY `FK_WithdrawalRequestsSet_ContainersSet_ContainerId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP FOREIGN KEY `FK_WithdrawalRequestsSet_ContainerSizesSet_ContainerSizeId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP FOREIGN KEY `FK_WithdrawalRequestsSet_ContainerTypesSet_ContainerTypeId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP INDEX `IX_WithdrawalRequestsSet_ActiveRequestKey`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP INDEX `IX_WR_ContainerNo_Size_Type`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP INDEX `IX_WithdrawalRequestsSet_ContainerId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP INDEX `IX_WithdrawalRequestsSet_ContainerSizeId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP INDEX `IX_WithdrawalRequestsSet_ContainerTypeId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP COLUMN `ActiveRequestKey`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP COLUMN `ContainerId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP COLUMN `ContainerNoNormalized`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP COLUMN `ContainerSizeId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    ALTER TABLE `WithdrawalRequestsSet` DROP COLUMN `ContainerTypeId`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE UNIQUE INDEX `IX_WRL_ActiveRequestKey` ON `WithdrawalRequestLinesSet` (`ActiveRequestKey`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE INDEX `IX_WRL_ContainerId` ON `WithdrawalRequestLinesSet` (`ContainerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE INDEX `IX_WRL_ContainerNo_Size_Type` ON `WithdrawalRequestLinesSet` (`ContainerNoNormalized`, `ContainerSizeId`, `ContainerTypeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE INDEX `IX_WRL_ContainerSizeId` ON `WithdrawalRequestLinesSet` (`ContainerSizeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE INDEX `IX_WRL_ContainerTypeId` ON `WithdrawalRequestLinesSet` (`ContainerTypeId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    CREATE UNIQUE INDEX `IX_WRL_RequestId_LineNo` ON `WithdrawalRequestLinesSet` (`WithdrawalRequestId`, `LineNo`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630160000_AddWithdrawalRequestLines') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630160000_AddWithdrawalRequestLines', '7.0.20');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

