import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile, canViewMobile } from "@/lib/permissions";
import { db } from "@/lib/db";

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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canViewMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Insufficient permissions to view mobile showcase." },
        { status: 403 }
      );
    }

    const isEditor = canManageMobile(user);

    // Fetch all showcase media
    const media = await db.mobileShowcaseMedia.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    // Fetch showcase content
    let content = await db.mobileShowcaseContent.findUnique({
      where: { id: "cxa_mobile_showcase_content" },
    });

    if (!content) {
      content = await db.mobileShowcaseContent.create({
        data: {
          id: "cxa_mobile_showcase_content",
          appName: "CodeXa Mobile",
          appTagline: "Official CodeXa Agency Workspace",
          badgeText: "Available Exclusively on Our Official Website",
          developerName: "CodeXa Agency",
          platform: "Android",
          packageName: "com.codexa.app",
          shortDescription: "Your complete CodeXa workspace, connected wherever you go. Attendance, Classes, Projects, Assignments, Communication. Everything in one place.",
          fullDescription: "CodeXa Mobile is the official Android workspace for CodeXa Agency members.",
          compatibilityText: "Android 8.0 or later • Compatible with SDK 26+",
          officialWebsiteUrl: "https://codxa-agency.online",
          supportEmail: "contact@codxa-agency.online",
          supportPhone: "+91 7075920852",
          featuresJson: [],
          installationStepsJson: [],
          troubleshootingJson: [],
          isPubliclyVisible: true,
          contentRevision: 1,
        },
      });
    }

    const serializedMedia = media.map((m) => ({
      ...m,
      fileSize: Number(m.fileSize || 0),
    }));

    return NextResponse.json({
      success: true,
      isEditor,
      media: serializedMedia,
      content,
      stats: {
        totalScreenshots: media.filter((m) => m.mediaCategory === "SCREENSHOT" || m.mediaType === "IMAGE").length,
        totalVideos: media.filter((m) => m.mediaCategory === "DEMO_VIDEO" || m.mediaType === "VIDEO").length,
        publishedCount: media.filter((m) => m.isPublished).length,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/admin/mobile/showcase]", err);
    return NextResponse.json({ error: err?.message || "Failed to load showcase data." }, { status: 500 });
  }
}
