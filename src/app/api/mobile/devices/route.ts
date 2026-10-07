import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveRequestUser(req: NextRequest) {
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

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const { deviceId, deviceName, platform = "ANDROID", appVersion = "1.0.0" } = body;

    if (!deviceId) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_DEVICE_ID" } }, { status: 400 });
    }

    await db.mobileSession.upsert({
      where: { id: `${user.id}_${deviceId}` },
      update: {
        deviceName: deviceName || "Android Mobile",
        appVersion,
        platform,
        lastActive: new Date(),
        isRevoked: false,
      },
      create: {
        id: `${user.id}_${deviceId}`,
        userId: user.id,
        deviceId,
        deviceName: deviceName || "Android Mobile",
        platform,
        appVersion,
      },
    });

    return NextResponse.json({ ok: true, message: "Device registered for push notifications." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (deviceId) {
      await db.mobileSession.updateMany({
        where: { userId: user.id, deviceId },
        data: { isRevoked: true },
      });
    }

    return NextResponse.json({ ok: true, message: "Device unregistered." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}