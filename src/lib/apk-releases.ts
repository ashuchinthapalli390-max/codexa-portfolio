import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { getOrCreateGlobalMobileConfig } from "@/lib/mobile-features";
import { sendFcmPushToUser } from "@/lib/firebase-admin";
import { sendPushNotification } from "@/lib/push";

export interface SerializedMobileAppRelease {
  id: string;
  appId: string;
  platform: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  releaseChannel: string;
  storageProvider: string;
  storageBucket: string;
  storageKey: string;
  apkDownloadUrl: string;
  apkFileSize: number;
  apkSha256: string;
  signingCertificateFingerprint: string | null;
  releaseNotes: string | null;
  status: string;
  updateType: string;
  minimumSupportedVersionCode: number;
  isCurrentPublished: boolean;
  uploadedById: string;
  uploadedByName: string | null;
  uploadedAt: string;
  publishedById: string | null;
  publishedByName: string | null;
  publishedAt: string | null;
  downloadCount: number;
  updateSuccessCount: number;
  validationReport: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Safely converts Prisma BigInt fields and dates for JSON responses.
 */
export function serializeRelease(release: any): SerializedMobileAppRelease {
  return {
    ...release,
    apkFileSize: Number(release.apkFileSize || 0),
    uploadedAt: release.uploadedAt instanceof Date ? release.uploadedAt.toISOString() : release.uploadedAt,
    publishedAt: release.publishedAt instanceof Date ? release.publishedAt.toISOString() : release.publishedAt,
    createdAt: release.createdAt instanceof Date ? release.createdAt.toISOString() : release.createdAt,
    updatedAt: release.updatedAt instanceof Date ? release.updatedAt.toISOString() : release.updatedAt,
  };
}

/**
 * Publishes a release atomically, updates MobileAppConfig, and triggers broadcasts.
 */
export async function publishMobileRelease({
  releaseId,
  publisherId,
  publisherName,
  notifyUsers = true,
}: {
  releaseId: string;
  publisherId: string;
  publisherName: string;
  notifyUsers?: boolean;
}) {
  const release = await db.mobileAppRelease.findUnique({
    where: { id: releaseId },
  });

  if (!release) {
    throw new Error("Release not found.");
  }

  if (release.status === "FAILED") {
    throw new Error("Cannot publish a failed or invalid release.");
  }

  // 1. Transaction to update release states atomically
  const now = new Date();
  const updatedRelease = await db.$transaction(async (tx) => {
    // Demote any currently published release for this platform and channel
    await tx.mobileAppRelease.updateMany({
      where: {
        platform: release.platform,
        releaseChannel: release.releaseChannel,
        isCurrentPublished: true,
        id: { not: releaseId },
      },
      data: {
        isCurrentPublished: false,
        status: "ARCHIVED",
      },
    });

    // Mark target release as PUBLISHED and current
    return await tx.mobileAppRelease.update({
      where: { id: releaseId },
      data: {
        status: "PUBLISHED",
        isCurrentPublished: true,
        publishedById: publisherId,
        publishedByName: publisherName,
        publishedAt: now,
      },
    });
  });

  // 2. Synchronize MobileAppConfig
  const globalConfig = await getOrCreateGlobalMobileConfig();
  await db.mobileAppConfig.update({
    where: { id: globalConfig.id },
    data: {
      currentVersion: release.versionName,
      buildNumber: release.versionCode,
      downloadUrl: release.apkDownloadUrl,
      androidApkUrl: release.apkDownloadUrl,
      releaseNotes: release.releaseNotes || globalConfig.releaseNotes,
      forceUpdateEnabled: release.updateType === "MANDATORY",
      softUpdateEnabled: release.updateType === "OPTIONAL",
      minVersion: release.updateType === "MANDATORY" ? release.versionName : globalConfig.minVersion,
      configVersion: (globalConfig.configVersion || 1) + 1,
    },
  });

  // 3. Log Audit Trail
  await dataStore.logAudit({
    actorId: publisherId,
    actorName: publisherName,
    targetId: release.id,
    action: "MOBILE_APP_RELEASE_PUBLISHED",
    details: `Published Android APK release v${release.versionName} (Build ${release.versionCode}, Channel: ${release.releaseChannel}, Type: ${release.updateType}).`,
  });

  // 4. Dispatch Notifications if enabled
  if (notifyUsers) {
    // Run asynchronously in background without blocking response
    dispatchReleaseBroadcast(updatedRelease).catch((err) => {
      console.error("[dispatchReleaseBroadcast error]", err);
    });
  }

  return serializeRelease(updatedRelease);
}

/**
 * Dispatches In-App, FCM Push, and Web Push notifications for a newly published release.
 */
export async function dispatchReleaseBroadcast(release: any) {
  try {
    const isMandatory = release.updateType === "MANDATORY";
    const title = isMandatory
      ? `Critical Update: CodeXa v${release.versionName} Required`
      : `CodeXa Update Available: v${release.versionName}`;
    const body = `Version ${release.versionName} (Build ${release.versionCode}) is now available. ${
      release.releaseNotes ? release.releaseNotes.substring(0, 100) : "Tap to download and install update."
    }`;

    // A. In-App Notifications: Create notification for all active users
    const activeUsers = await db.user.findMany({
      where: { isActive: true },
      select: { id: true },
      take: 2000,
    });

    if (activeUsers.length > 0) {
      await db.notification.createMany({
        data: activeUsers.map((u) => ({
          userId: u.id,
          type: "MOBILE_APP_UPDATE",
          title,
          message: body,
          link: `/dashboard/apps/mobile`,
        })),
        skipDuplicates: true,
      });
    }

    // B. Mobile Device FCM Push Notifications: Send to all active mobile sessions
    const activeSessions = await db.mobileSession.findMany({
      where: { isRevoked: false, fcmToken: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
      take: 1000,
    });

    for (const session of activeSessions) {
      sendFcmPushToUser(session.userId, {
        title,
        body,
        data: {
          type: "MOBILE_APP_UPDATE",
          versionName: release.versionName,
          versionCode: String(release.versionCode),
          updateType: release.updateType,
          downloadUrl: release.apkDownloadUrl,
          sha256: release.apkSha256,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      }).catch(() => {});
    }

    // C. Web Push Notifications
    for (const u of activeUsers.slice(0, 500)) {
      sendPushNotification(u.id, {
        title,
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: `codexa-update-${release.versionCode}`,
        data: {
          url: "/dashboard/apps/mobile",
        },
      }).catch(() => {});
    }
  } catch (broadcastErr) {
    console.error("[dispatchReleaseBroadcast failure]", broadcastErr);
  }
}

/**
 * Rolls back to a previous release atomically.
 */
export async function rollbackMobileRelease({
  releaseId,
  actorId,
  actorName,
}: {
  releaseId: string;
  actorId: string;
  actorName: string;
}) {
  const targetRelease = await db.mobileAppRelease.findUnique({
    where: { id: releaseId },
  });

  if (!targetRelease) {
    throw new Error("Target release for rollback not found.");
  }

  const updated = await db.$transaction(async (tx) => {
    // Demote current published
    await tx.mobileAppRelease.updateMany({
      where: {
        platform: targetRelease.platform,
        releaseChannel: targetRelease.releaseChannel,
        isCurrentPublished: true,
      },
      data: {
        isCurrentPublished: false,
        status: "ARCHIVED",
      },
    });

    // Promote target release
    return await tx.mobileAppRelease.update({
      where: { id: releaseId },
      data: {
        isCurrentPublished: true,
        status: "PUBLISHED",
      },
    });
  });

  // Update MobileAppConfig
  const globalConfig = await getOrCreateGlobalMobileConfig();
  await db.mobileAppConfig.update({
    where: { id: globalConfig.id },
    data: {
      currentVersion: targetRelease.versionName,
      buildNumber: targetRelease.versionCode,
      downloadUrl: targetRelease.apkDownloadUrl,
      androidApkUrl: targetRelease.apkDownloadUrl,
      releaseNotes: targetRelease.releaseNotes || globalConfig.releaseNotes,
      forceUpdateEnabled: targetRelease.updateType === "MANDATORY",
      configVersion: (globalConfig.configVersion || 1) + 1,
    },
  });

  await dataStore.logAudit({
    actorId,
    actorName,
    targetId: targetRelease.id,
    action: "MOBILE_APP_RELEASE_ROLLED_BACK",
    details: `Rolled back active release pointer to v${targetRelease.versionName} (Build ${targetRelease.versionCode}).`,
  });

  return serializeRelease(updated);
}
