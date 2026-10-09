import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile } from "@/lib/permissions";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { serializeRelease } from "@/lib/apk-releases";

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

export async function POST(
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
        { error: "Forbidden. Only Founder and Co-Founder can archive releases." },
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
        {
          error:
            "Cannot archive the currently active published release. Please publish another release or roll back first.",
        },
        { status: 400 }
      );
    }

    const updated = await db.mobileAppRelease.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        isCurrentPublished: false,
      },
    });

    const actorName = user.displayName || user.username || "Founder";
    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: id,
      action: "MOBILE_APP_RELEASE_ARCHIVED",
      details: `Archived release v${release.versionName} (Build ${release.versionCode}).`,
    });

    return NextResponse.json({
      success: true,
      release: serializeRelease(updated),
    });
  } catch (err: any) {
    console.error("[POST /api/admin/mobile/releases/[id]/archive]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to archive release." },
      { status: 500 }
    );
  }
}
