import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { canManageMobile, canViewMobile, getEffectiveRole } from "@/lib/permissions";
import {
  getOrCreateGlobalMobileConfig,
  MOBILE_FEATURE_LIST,
} from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = auth.user;
  if (!canViewMobile(user)) {
    return NextResponse.json(
      { error: "Forbidden. Access restricted to Founder, Co-Founder, or CTO." },
      { status: 403 }
    );
  }

  try {
    const config = await getOrCreateGlobalMobileConfig();

    const [roleOverridesCount, userOverridesCount, activeSessionsCount, recentAuditLogs] =
      await Promise.all([
        db.mobileFeatureOverride.count({ where: { scope: "ROLE" } }),
        db.mobileFeatureOverride.count({ where: { scope: "USER" } }),
        db.mobileSession.count({ where: { isRevoked: false } }),
        db.auditLog.findMany({
          where: { action: { startsWith: "MOBILE_" } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const isEditor = canManageMobile(user);

    return NextResponse.json(
      {
        success: true,
        config,
        featuresList: MOBILE_FEATURE_LIST,
        isEditor,
        stats: {
          roleOverridesCount,
          userOverridesCount,
          activeSessionsCount,
          configVersion: config.configVersion,
          platformStatus: config.platformStatus,
          currentVersion: config.currentVersion,
          minVersion: config.minVersion,
          maintenanceEnabled: config.maintenanceEnabled,
          forceUpdateEnabled: config.forceUpdateEnabled,
        },
        recentAuditLogs,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/admin/apps/mobile]", err);
    return NextResponse.json(
      { error: "Failed to load mobile app configuration." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = auth.user;
  if (!canManageMobile(user)) {
    return NextResponse.json(
      { error: "Forbidden. Only Founder and Co-Founder can edit Mobile App settings." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const currentConfig = await getOrCreateGlobalMobileConfig();

    const newVersion = (currentConfig.configVersion || 1) + 1;
    const actorName = user.displayName || user.username || "Admin";
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";

    // Track specific audit events
    if (body.maintenanceEnabled !== undefined && body.maintenanceEnabled !== currentConfig.maintenanceEnabled) {
      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: currentConfig.id,
        action: body.maintenanceEnabled ? "MOBILE_MAINTENANCE_ENABLED" : "MOBILE_MAINTENANCE_DISABLED",
        details: `${actorName} ${body.maintenanceEnabled ? "enabled" : "disabled"} Mobile App Maintenance Mode. Message: "${body.maintenanceMessage || currentConfig.maintenanceMessage}"`,
        ipAddress,
      });
    }

    if (body.forceUpdateEnabled !== undefined && body.forceUpdateEnabled !== currentConfig.forceUpdateEnabled) {
      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: currentConfig.id,
        action: body.forceUpdateEnabled ? "MOBILE_FORCE_UPDATE_ENABLED" : "MOBILE_FORCE_UPDATE_DISABLED",
        details: `${actorName} ${body.forceUpdateEnabled ? "enabled" : "disabled"} Force Update. Min version: ${body.minVersion || currentConfig.minVersion}`,
        ipAddress,
      });
    }

    if (body.currentVersion && body.currentVersion !== currentConfig.currentVersion) {
      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: currentConfig.id,
        action: "MOBILE_APP_VERSION_CHANGED",
        details: `${actorName} changed mobile app current version from ${currentConfig.currentVersion} to ${body.currentVersion}.`,
        ipAddress,
      });
    }

    if (body.announcementEnabled !== undefined && body.announcementEnabled !== currentConfig.announcementEnabled) {
      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: currentConfig.id,
        action: "MOBILE_ANNOUNCEMENT_PUBLISHED",
        details: `${actorName} updated announcement: "${body.announcementTitle || currentConfig.announcementTitle}" (active=${body.announcementEnabled})`,
        ipAddress,
      });
    }

    // Sanitize and prepare update payload
    const allowedFields = [
      "appName",
      "platformStatus",
      "currentVersion",
      "minVersion",
      "buildNumber",
      "maintenanceEnabled",
      "maintenanceMessage",
      "expectedMaintenanceEnd",
      "forceUpdateEnabled",
      "softUpdateEnabled",
      "releaseNotes",
      "downloadUrl",
      "androidApkUrl",
      "playStoreUrl",
      "iosStoreUrl",
      "altDownloadUrl",
      "attendanceEnabled",
      "dmEnabled",
      "postsEnabled",
      "commentsEnabled",
      "pushEnabled",
      "projectsEnabled",
      "paymentsEnabled",
      "documentsEnabled",
      "leaveRequestsEnabled",
      "profileEnabled",
      "employeeSelfAttendance",
      "internSelfAttendance",
      "allowAttendanceHistory",
      "allowAttendanceCorrection",
      "allowLateAttendance",
      "showAttendancePercentage",
      "requireActiveAttendanceWindow",
      "defaultAttendanceDuration",
      "groupMessagesEnabled",
      "projectChatEnabled",
      "fileAttachmentsEnabled",
      "imageAttachmentsEnabled",
      "readReceiptsEnabled",
      "typingIndicatorsEnabled",
      "messageDeleteEnabled",
      "dmRoleMatrix",
      "likesEnabled",
      "videoUploadEnabled",
      "projectUpdatesEnabled",
      "mentionsEnabled",
      "internalSharesEnabled",
      "postsRolePermissions",
      "showAssignedProjectsOnly",
      "allowProjectUpdates",
      "allowMobileProjectComments",
      "allowProjectMediaUpload",
      "showProjectMembers",
      "showProjectStatus",
      "pushCategories",
      "internFeeVisible",
      "internFeeTotal",
      "internFeeBreakdown",
      "paymentPortalUrl",
      "docOfferLetter",
      "docIdCard",
      "docPayslips",
      "docInternshipCert",
      "docCompletionCert",
      "docExperienceLetter",
      "docNda",
      "profileViewingEnabled",
      "profileEditingEnabled",
      "pfpUploadEnabled",
      "bioEditingEnabled",
      "skillsEditingEnabled",
      "socialLinksEditingEnabled",
      "leaveAttachmentsEnabled",
      "leaveHistoryEnabled",
      "leaveStatusEnabled",
      "leaveCancellationEnabled",
      "announcementEnabled",
      "announcementTitle",
      "announcementMessage",
      "announcementType",
      "announcementStartDate",
      "announcementEndDate",
      "announcementActionLabel",
      "announcementActionUrl",
      "maxDevicesPerUser",
      "multipleSessionsAllowed",
      "forceLogoutAllDevices",
      "requireReauthSensitive",
      "sessionExpiryDays",
      "blockRootedDevices",
      "screenshotProtection",
      "requireLatestVersionLogin",
    ];

    const updateData: Record<string, any> = {
      configVersion: newVersion,
      updatedBy: actorName,
    };

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === "announcementStartDate" || key === "announcementEndDate" || key === "expectedMaintenanceEnd") {
          updateData[key] = body[key] ? new Date(body[key]) : null;
        } else {
          updateData[key] = body[key];
        }
      }
    }

    const updated = await db.mobileAppConfig.update({
      where: { id: currentConfig.id },
      data: updateData,
    });

    // General audit log
    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: updated.id,
      action: "MOBILE_CONFIG_UPDATED",
      details: `${actorName} updated Mobile App configuration settings (v${newVersion}).`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Mobile configuration updated successfully.",
      config: updated,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/apps/mobile]", err);
    return NextResponse.json(
      { error: "Failed to update mobile app configuration." },
      { status: 500 }
    );
  }
}
