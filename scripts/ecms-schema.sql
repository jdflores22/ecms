CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    ALTER DATABASE CHARACTER SET utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `DepotsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Address` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Capacity` int NOT NULL,
        `IsActive` tinyint(1) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_DepotsSet` PRIMARY KEY (`Id`)
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `RolesSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Name` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_RolesSet` PRIMARY KEY (`Id`)
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `ShippingLinesSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Code` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `IsActive` tinyint(1) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_ShippingLinesSet` PRIMARY KEY (`Id`)
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `ContainersSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ContainerNo` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `Size` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Type` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ShippingLineId` int NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_ContainersSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ContainersSet_ShippingLinesSet_ShippingLineId` FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `UsersSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `Username` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `Email` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `PasswordHash` longtext CHARACTER SET utf8mb4 NOT NULL,
        `RoleId` int NOT NULL,
        `Status` int NOT NULL,
        `FullName` longtext CHARACTER SET utf8mb4 NULL,
        `ShippingLineId` int NULL,
        `DepotId` int NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_UsersSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_UsersSet_DepotsSet_DepotId` FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE SET NULL,
        CONSTRAINT `FK_UsersSet_RolesSet_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `RolesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_UsersSet_ShippingLinesSet_ShippingLineId` FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE SET NULL
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `AuditLogsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `UserId` int NOT NULL,
        `Action` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Module` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Details` longtext CHARACTER SET utf8mb4 NULL,
        `Timestamp` datetime(6) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_AuditLogsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_AuditLogsSet_UsersSet_UserId` FOREIGN KEY (`UserId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `PreAdvicesSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ReferenceNo` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `BrokerId` int NOT NULL,
        `ShippingLineId` int NOT NULL,
        `ContainerId` int NOT NULL,
        `Status` int NOT NULL,
        `Remarks` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_PreAdvicesSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_PreAdvicesSet_ContainersSet_ContainerId` FOREIGN KEY (`ContainerId`) REFERENCES `ContainersSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_PreAdvicesSet_ShippingLinesSet_ShippingLineId` FOREIGN KEY (`ShippingLineId`) REFERENCES `ShippingLinesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_PreAdvicesSet_UsersSet_BrokerId` FOREIGN KEY (`BrokerId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `RefreshTokensSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `UserId` int NOT NULL,
        `Token` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `ExpiresAt` datetime(6) NOT NULL,
        `IsRevoked` tinyint(1) NOT NULL,
        `RevokedAt` datetime(6) NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_RefreshTokensSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_RefreshTokensSet_UsersSet_UserId` FOREIGN KEY (`UserId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `EvaluationsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `PreAdviceId` int NOT NULL,
        `EvaluatorId` int NOT NULL,
        `DepotId` int NULL,
        `Remarks` longtext CHARACTER SET utf8mb4 NULL,
        `Status` int NOT NULL,
        `EvaluatedAt` datetime(6) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_EvaluationsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_EvaluationsSet_DepotsSet_DepotId` FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`),
        CONSTRAINT `FK_EvaluationsSet_PreAdvicesSet_PreAdviceId` FOREIGN KEY (`PreAdviceId`) REFERENCES `PreAdvicesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_EvaluationsSet_UsersSet_EvaluatorId` FOREIGN KEY (`EvaluatorId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `SchedulesSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `PreAdviceId` int NOT NULL,
        `DepotId` int NOT NULL,
        `Date` date NOT NULL,
        `Time` time(6) NOT NULL,
        `SlotNo` int NOT NULL,
        `Status` int NOT NULL,
        `TruckerId` int NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_SchedulesSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_SchedulesSet_DepotsSet_DepotId` FOREIGN KEY (`DepotId`) REFERENCES `DepotsSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_SchedulesSet_PreAdvicesSet_PreAdviceId` FOREIGN KEY (`PreAdviceId`) REFERENCES `PreAdvicesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_SchedulesSet_UsersSet_TruckerId` FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`) ON DELETE SET NULL
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `PaymentsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ScheduleId` int NOT NULL,
        `TruckerId` int NOT NULL,
        `Amount` decimal(65,30) NOT NULL,
        `ProofFile` longtext CHARACTER SET utf8mb4 NULL,
        `Status` int NOT NULL,
        `PaidAt` datetime(6) NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_PaymentsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_PaymentsSet_SchedulesSet_ScheduleId` FOREIGN KEY (`ScheduleId`) REFERENCES `SchedulesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_PaymentsSet_UsersSet_TruckerId` FOREIGN KEY (`TruckerId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE TABLE `QRBookingsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `ScheduleId` int NOT NULL,
        `QRCode` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `PayloadJson` longtext CHARACTER SET utf8mb4 NOT NULL,
        `GeneratedAt` datetime(6) NOT NULL,
        `IsUsed` tinyint(1) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_QRBookingsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_QRBookingsSet_SchedulesSet_ScheduleId` FOREIGN KEY (`ScheduleId`) REFERENCES `SchedulesSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_AuditLogsSet_UserId` ON `AuditLogsSet` (`UserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_ContainersSet_ContainerNo` ON `ContainersSet` (`ContainerNo`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_ContainersSet_ShippingLineId` ON `ContainersSet` (`ShippingLineId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_EvaluationsSet_DepotId` ON `EvaluationsSet` (`DepotId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_EvaluationsSet_EvaluatorId` ON `EvaluationsSet` (`EvaluatorId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_EvaluationsSet_PreAdviceId` ON `EvaluationsSet` (`PreAdviceId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_PaymentsSet_ScheduleId` ON `PaymentsSet` (`ScheduleId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_PaymentsSet_TruckerId` ON `PaymentsSet` (`TruckerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_PreAdvicesSet_BrokerId` ON `PreAdvicesSet` (`BrokerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_PreAdvicesSet_ContainerId` ON `PreAdvicesSet` (`ContainerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_PreAdvicesSet_ReferenceNo` ON `PreAdvicesSet` (`ReferenceNo`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_PreAdvicesSet_ShippingLineId` ON `PreAdvicesSet` (`ShippingLineId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_QRBookingsSet_QRCode` ON `QRBookingsSet` (`QRCode`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_QRBookingsSet_ScheduleId` ON `QRBookingsSet` (`ScheduleId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_RefreshTokensSet_Token` ON `RefreshTokensSet` (`Token`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_RefreshTokensSet_UserId` ON `RefreshTokensSet` (`UserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_RolesSet_Name` ON `RolesSet` (`Name`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_SchedulesSet_DepotId` ON `SchedulesSet` (`DepotId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_SchedulesSet_PreAdviceId` ON `SchedulesSet` (`PreAdviceId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_SchedulesSet_TruckerId` ON `SchedulesSet` (`TruckerId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_ShippingLinesSet_Code` ON `ShippingLinesSet` (`Code`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_UsersSet_DepotId` ON `UsersSet` (`DepotId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_UsersSet_Email` ON `UsersSet` (`Email`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_UsersSet_RoleId` ON `UsersSet` (`RoleId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE INDEX `IX_UsersSet_ShippingLineId` ON `UsersSet` (`ShippingLineId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    CREATE UNIQUE INDEX `IX_UsersSet_Username` ON `UsersSet` (`Username`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623054746_InitialCreate') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623054746_InitialCreate', '7.0.20');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623073350_AddPreAdviceDocuments') THEN

    CREATE TABLE `PreAdviceDocumentsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `PreAdviceId` int NOT NULL,
        `FileName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `FilePath` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ContentType` longtext CHARACTER SET utf8mb4 NOT NULL,
        `FileSize` bigint NOT NULL,
        `UploadedById` int NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_PreAdviceDocumentsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_PreAdviceDocumentsSet_PreAdvicesSet_PreAdviceId` FOREIGN KEY (`PreAdviceId`) REFERENCES `PreAdvicesSet` (`Id`) ON DELETE CASCADE,
        CONSTRAINT `FK_PreAdviceDocumentsSet_UsersSet_UploadedById` FOREIGN KEY (`UploadedById`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623073350_AddPreAdviceDocuments') THEN

    CREATE INDEX `IX_PreAdviceDocumentsSet_PreAdviceId` ON `PreAdviceDocumentsSet` (`PreAdviceId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623073350_AddPreAdviceDocuments') THEN

    CREATE INDEX `IX_PreAdviceDocumentsSet_UploadedById` ON `PreAdviceDocumentsSet` (`UploadedById`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623073350_AddPreAdviceDocuments') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623073350_AddPreAdviceDocuments', '7.0.20');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623075201_AddPasswordResetTokens') THEN

    CREATE TABLE `PasswordResetTokensSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `UserId` int NOT NULL,
        `Token` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `ExpiresAt` datetime(6) NOT NULL,
        `IsUsed` tinyint(1) NOT NULL,
        `UsedAt` datetime(6) NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_PasswordResetTokensSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_PasswordResetTokensSet_UsersSet_UserId` FOREIGN KEY (`UserId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623075201_AddPasswordResetTokens') THEN

    CREATE UNIQUE INDEX `IX_PasswordResetTokensSet_Token` ON `PasswordResetTokensSet` (`Token`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623075201_AddPasswordResetTokens') THEN

    CREATE INDEX `IX_PasswordResetTokensSet_UserId` ON `PasswordResetTokensSet` (`UserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623075201_AddPasswordResetTokens') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623075201_AddPasswordResetTokens', '7.0.20');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623165125_AddRoleCapabilities') THEN

    ALTER TABLE `RolesSet` ADD `CapabilitiesJson` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623165125_AddRoleCapabilities') THEN

    ALTER TABLE `RolesSet` ADD `Description` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623165125_AddRoleCapabilities') THEN

    ALTER TABLE `RolesSet` ADD `Label` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623165125_AddRoleCapabilities') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623165125_AddRoleCapabilities', '7.0.20');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623174038_AddContainerPhotoFields') THEN

    ALTER TABLE `PreAdviceDocumentsSet` ADD `Category` int NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623174038_AddContainerPhotoFields') THEN

    ALTER TABLE `PreAdviceDocumentsSet` ADD `Comment` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623174038_AddContainerPhotoFields') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623174038_AddContainerPhotoFields', '7.0.20');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623183601_AddNotifications') THEN

    CREATE TABLE `NotificationsSet` (
        `Id` int NOT NULL AUTO_INCREMENT,
        `UserId` int NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Message` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Category` longtext CHARACTER SET utf8mb4 NOT NULL,
        `LinkPath` longtext CHARACTER SET utf8mb4 NULL,
        `IsRead` tinyint(1) NOT NULL,
        `ReadAt` datetime(6) NULL,
        `ActorUserId` int NULL,
        `ReferenceNo` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_NotificationsSet` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_NotificationsSet_UsersSet_ActorUserId` FOREIGN KEY (`ActorUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE SET NULL,
        CONSTRAINT `FK_NotificationsSet_UsersSet_UserId` FOREIGN KEY (`UserId`) REFERENCES `UsersSet` (`Id`) ON DELETE CASCADE
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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623183601_AddNotifications') THEN

    CREATE INDEX `IX_NotificationsSet_ActorUserId` ON `NotificationsSet` (`ActorUserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623183601_AddNotifications') THEN

    CREATE INDEX `IX_NotificationsSet_UserId_IsRead_CreatedAt` ON `NotificationsSet` (`UserId`, `IsRead`, `CreatedAt`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623183601_AddNotifications') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623183601_AddNotifications', '7.0.20');

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
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260624034726_AddRoleAllowedPages') THEN

    ALTER TABLE `RolesSet` ADD `AllowedPagesJson` longtext CHARACTER SET utf8mb4 NOT NULL DEFAULT ('[]');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260624034726_AddRoleAllowedPages') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260624034726_AddRoleAllowedPages', '7.0.20');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

