import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { releaseId, eventType, deviceId, versionCode, metadata } = body;

    if (!eventType) {
      return NextResponse.json({ error: "eventType is required." }, { status: 400 });
    }

    const validEventTypes = [
      "CHECK_UPDATE",
      "DOWNLOAD_START",
      "DOWNLOAD_COMPLETE",
      "UPDATE_INSTALLED",
      "DOWNLOAD_FAILED",
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid eventType." }, { status: 400 });
    }

    let targetReleaseId = releaseId;

    if (!targetReleaseId) {
      const active = await db.mobileAppRelease.findFirst({
        where: { isCurrentPublished: true, platform: "ANDROID" },
        select: { id: true },
      });
      targetReleaseId = active?.id || null;
    }

    if (!targetReleaseId) {
      return NextResponse.json({ ok: true, tracked: false, reason: "No active release found." });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || null;
    const userAgent = req.headers.get("user-agent") || null;

    const event = await db.mobileReleaseEvent.create({
      data: {
        releaseId: targetReleaseId,
        eventType,
        deviceId: deviceId || null,
        versionCode: versionCode ? parseInt(String(versionCode), 10) : null,
        ipAddress,
        userAgent,
        metadata: metadata || null,
      },
    });

    if (eventType === "UPDATE_INSTALLED") {
      await db.mobileAppRelease.update({
        where: { id: targetReleaseId },
        data: { updateSuccessCount: { increment: 1 } },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, eventId: event.id });
  } catch (err: any) {
    console.error("[POST /api/mobile/app-update/events]", err);
    return NextResponse.json({ error: "Failed to log event." }, { status: 500 });
  }
}
