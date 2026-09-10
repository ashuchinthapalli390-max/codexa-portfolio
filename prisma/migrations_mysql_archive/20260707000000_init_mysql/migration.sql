-- CodeXa Agency — Initial MySQL Schema
-- Migration: 20260707000000_init_mysql
-- Provider: mysql
-- Applied via: prisma migrate deploy

-- ─── User ────────────────────────────────────────────────────────────────────
CREATE TABLE `User` (
    `id`           VARCHAR(30)  NOT NULL,
    `username`     VARCHAR(191) NULL,
    `email`        VARCHAR(191) NULL,
    `fullName`     VARCHAR(255) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role`         VARCHAR(20)  NOT NULL,
    `isActive`     BOOLEAN      NOT NULL DEFAULT TRUE,
    `lastLoginAt`  DATETIME(3)  NULL,
    `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)  NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── TeamProfile ─────────────────────────────────────────────────────────────
CREATE TABLE `TeamProfile` (
    `id`                 VARCHAR(30)  NOT NULL,
    `userId`             VARCHAR(30)  NULL,
    `memberType`         VARCHAR(20)  NOT NULL,
    `leadershipPosition` VARCHAR(30)  NULL,
    `displayName`        VARCHAR(255) NOT NULL,
    `publicBio`          TEXT         NULL,
    `mediaUrl`           VARCHAR(512) NULL,
    `mediaMimeType`      VARCHAR(100) NULL,
    `cropX`              DOUBLE       NULL,
    `cropY`              DOUBLE       NULL,
    `cropW`              DOUBLE       NULL,
    `cropH`              DOUBLE       NULL,
    `cropZoom`           DOUBLE       NULL,
    `cropRotation`       DOUBLE       NULL,
    `isPublic`           BOOLEAN      NOT NULL DEFAULT TRUE,
    `displayOrder`       INTEGER      NOT NULL DEFAULT 0,
    `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)  NOT NULL,

    UNIQUE INDEX `TeamProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── Session ─────────────────────────────────────────────────────────────────
CREATE TABLE `Session` (
    `id`               VARCHAR(30) NOT NULL,
    `userId`           VARCHAR(30) NOT NULL,
    `sessionTokenHash` VARCHAR(64) NOT NULL,
    `expiresAt`        DATETIME(3) NOT NULL,
    `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`        DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionTokenHash_key`(`sessionTokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── AccessKey ───────────────────────────────────────────────────────────────
CREATE TABLE `AccessKey` (
    `id`         VARCHAR(30)  NOT NULL,
    `userId`     VARCHAR(30)  NOT NULL,
    `label`      VARCHAR(255) NOT NULL,
    `keyHash`    VARCHAR(64)  NOT NULL,
    `role`       VARCHAR(20)  NOT NULL,
    `isActive`   BOOLEAN      NOT NULL DEFAULT TRUE,
    `maxUses`    INTEGER      NULL,
    `useCount`   INTEGER      NOT NULL DEFAULT 0,
    `expiresAt`  DATETIME(3)  NULL,
    `lastUsedAt` DATETIME(3)  NULL,
    `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3)  NOT NULL,

    UNIQUE INDEX `AccessKey_keyHash_key`(`keyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── AccessKeyAuditLog ───────────────────────────────────────────────────────
CREATE TABLE `AccessKeyAuditLog` (
    `id`          VARCHAR(30)  NOT NULL,
    `accessKeyId` VARCHAR(30)  NULL,
    `userId`      VARCHAR(30)  NULL,
    `action`      VARCHAR(30)  NOT NULL,
    `success`     BOOLEAN      NOT NULL,
    `ipAddress`   VARCHAR(45)  NULL,
    `userAgent`   VARCHAR(512) NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── PreAuthSession ──────────────────────────────────────────────────────────
CREATE TABLE `PreAuthSession` (
    `id`        VARCHAR(30) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `userId`    VARCHAR(30) NOT NULL,
    `role`      VARCHAR(20) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PreAuthSession_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── ProfileAuditLog ─────────────────────────────────────────────────────────
CREATE TABLE `ProfileAuditLog` (
    `id`           VARCHAR(30) NOT NULL,
    `actorUserId`  VARCHAR(30) NULL,
    `targetUserId` VARCHAR(30) NULL,
    `action`       VARCHAR(50) NOT NULL,
    `details`      TEXT        NOT NULL,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- ─── Foreign Keys ────────────────────────────────────────────────────────────
ALTER TABLE `TeamProfile` ADD CONSTRAINT `TeamProfile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccessKey` ADD CONSTRAINT `AccessKey_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccessKeyAuditLog` ADD CONSTRAINT `AccessKeyAuditLog_accessKeyId_fkey`
    FOREIGN KEY (`accessKeyId`) REFERENCES `AccessKey`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
