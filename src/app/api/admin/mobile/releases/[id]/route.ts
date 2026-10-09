import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile, canViewMobile } from "@/lib/permissions";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { serializeRelease } from "@/lib/apk-releases";
import { deleteApkFromStorage } from "@/lib/apk-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canViewMobile(user)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = params;
    const release = await db.mobileAppRelease.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      release: serializeRelease(release),
    });
  } catch (err: any) {
    console.error("[GET /api/admin/mobile/releases/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch release." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canManageMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Only Founder and Co-Founder can edit releases." },
        { status: 403 }
      );
    }

    const { id } = params;
    const release = await db.mobileAppRelease.findUnique({ where: { id } });

    if (!release) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (body.releaseNotes !== undefined) {
      updateData.releaseNotes = body.releaseNotes;
    }
    if (body.updateType !== undefined) {
      updateData.updateType = body.updateType === "MANDATORY" ? "MANDATORY" : "OPTIONAL";
    }
    if (body.minSupportedVersionCode !== undefined) {
      const code = parseInt(String(body.minSupportedVersionCode), 10);
      if (!isNaN(code) && code >= 1) {
        updateData.minimumSupportedVersionCode = code;
      }
    }

    const updated = await db.mobileAppRelease.update({
      where: { id },
      data: updateData,
    });

    // If this release is the currently published one and update policy changed, sync MobileAppConfig
    if (release.isCurrentPublished) {
      const globalConfig = await db.mobileAppConfig.findFirst({ where: { targetType: "GLOBAL" } });
      if (globalConfig) {
        await db.mobileAppConfig.update({
          where: { id: globalConfig.id },
          data: {
            forceUpdateEnabled: updated.updateType === "MANDATORY",
            softUpdateEnabled: updated.updateType === "OPTIONAL",
            releaseNotes: updated.releaseNotes || globalConfig.releaseNotes,
          },
        });
      }
    }

    const actorName = user.displayName || user.username || "Founder";
    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: id,
      action: "MOBILE_APP_RELEASE_UPDATED",
      details: `Updated metadata for release v${release.versionName} (Build ${release.versionCode}).`,
    });

    return NextResponse.json({
      success: true,
      release: serializeRelease(updated),
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/mobile/releases/[id]]", err);
    return NextResponse.json({ error: "Failed to update release." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canManageMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Only Founder and Co-Founder can delete releases." },
        { status: 403 }
      );
    }

    const { id } = params;
    const release = await db.mobileAppRelease.findUnique({ where: { id } });

    if (!release) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }

    if (release.isCurrentPublished) {
      return NextResponse.json(
        { error: "Cannot delete the currently active published release. Please publish another release first." },
        { status: 400 }
      );
    }

    // Attempt to delete cloud object
    if (release.storageBucket && release.storageKey) {
      await deleteApkFromStorage(release.storageBucket, release.storageKey).catch(() => {});
    }

    await db.mobileAppRelease.delete({ where: { id } });

    const actorName = user.displayName || user.username || "Founder";
    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: id,
      action: "MOBILE_APP_RELEASE_DELETED",
      details: `Deleted release v${release.versionName} (Build ${release.versionCode}).`,
    });

    return NextResponse.json({
      success: true,
      message: `Release v${release.versionName} deleted successfully.`,
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/mobile/releases/[id]]", err);
    return NextResponse.json({ error: "Failed to delete release." }, { status: 500 });
  }
}
