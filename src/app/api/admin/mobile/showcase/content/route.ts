import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile, canViewMobile } from "@/lib/permissions";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";

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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canViewMobile(user)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const content = await db.mobileShowcaseContent.findUnique({
      where: { id: "cxa_mobile_showcase_content" },
    });

    return NextResponse.json({ success: true, content });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load content." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canManageMobile(user)) {
      return NextResponse.json({ error: "Forbidden. Founder & Co-Founder only." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const actorName = user.displayName || user.username || "Founder";

    const updated = await db.mobileShowcaseContent.upsert({
      where: { id: "cxa_mobile_showcase_content" },
      create: {
        id: "cxa_mobile_showcase_content",
        appName: body.appName || "CodeXa Mobile",
        appTagline: body.appTagline || "Official CodeXa Agency Workspace",
        badgeText: body.badgeText || "Available Exclusively on Our Official Website",
        shortDescription: body.shortDescription || "",
        fullDescription: body.fullDescription || "",
        compatibilityText: body.compatibilityText || "Android 8.0 or later • Compatible with SDK 26+",
        supportEmail: body.supportEmail || "contact@codxa-agency.online",
        supportPhone: body.supportPhone || "+91 7075920852",
        featuresJson: body.featuresJson || [],
        installationStepsJson: body.installationStepsJson || [],
        troubleshootingJson: body.troubleshootingJson || [],
        contentRevision: 1,
        updatedById: user.id,
        updatedByName: actorName,
      },
      update: {
        appName: body.appName !== undefined ? body.appName : undefined,
        appTagline: body.appTagline !== undefined ? body.appTagline : undefined,
        badgeText: body.badgeText !== undefined ? body.badgeText : undefined,
        shortDescription: body.shortDescription !== undefined ? body.shortDescription : undefined,
        fullDescription: body.fullDescription !== undefined ? body.fullDescription : undefined,
        compatibilityText: body.compatibilityText !== undefined ? body.compatibilityText : undefined,
        supportEmail: body.supportEmail !== undefined ? body.supportEmail : undefined,
        supportPhone: body.supportPhone !== undefined ? body.supportPhone : undefined,
        featuresJson: body.featuresJson !== undefined ? body.featuresJson : undefined,
        installationStepsJson: body.installationStepsJson !== undefined ? body.installationStepsJson : undefined,
        troubleshootingJson: body.troubleshootingJson !== undefined ? body.troubleshootingJson : undefined,
        contentRevision: { increment: 1 },
        updatedById: user.id,
        updatedByName: actorName,
      },
    });

    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: "cxa_mobile_showcase_content",
      action: "MOBILE_SHOWCASE_CONTENT_UPDATED",
      details: `Updated mobile showcase content and features specification (Revision: ${updated.contentRevision}).`,
    });

    return NextResponse.json({ success: true, content: updated });
  } catch (err: any) {
    console.error("[PUT /api/admin/mobile/showcase/content]", err);
    return NextResponse.json({ error: err?.message || "Failed to update content." }, { status: 500 });
  }
}
