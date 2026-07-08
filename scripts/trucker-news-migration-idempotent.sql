-- Idempotent: create TruckerNewsSet for admin trucker news feed (web + Android carousel).
-- Run in phpMyAdmin if /api/trucker-news returns 500 in production.

CREATE TABLE IF NOT EXISTS `TruckerNewsSet` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Title` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
    `Body` varchar(4000) CHARACTER SET utf8mb4 NOT NULL,
    `ImagePath` varchar(512) CHARACTER SET utf8mb4 NULL,
    `ImageFileName` varchar(256) CHARACTER SET utf8mb4 NULL,
    `ImageContentType` varchar(128) CHARACTER SET utf8mb4 NULL,
    `ImageFileSize` bigint NULL,
    `IsPublished` tinyint(1) NOT NULL,
    `PublishedAt` datetime(6) NULL,
    `CreatedByUserId` int NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_TruckerNewsSet_IsPublished_PublishedAt` (`IsPublished`, `PublishedAt`),
    CONSTRAINT `FK_TruckerNews_CreatedByUserId`
        FOREIGN KEY (`CreatedByUserId`) REFERENCES `UsersSet` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

INSERT IGNORE INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260708143000_AddTruckerNews', '7.0.20');
