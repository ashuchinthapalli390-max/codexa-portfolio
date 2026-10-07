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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const sessions = await db.session.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });

    const mobileSessions = await db.mobileSession.findMany({
      where: { userId: user.id, isRevoked: false },
      orderBy: { lastActive: "desc" },
    });

    return NextResponse.json({
      ok: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent || "Web / Desktop",
        lastSeenAt: s.lastSeenAt,
        createdAt: s.createdAt,
      })),
      mobileDevices: mobileSessions.map((m) => ({
        id: m.id,
        deviceId: m.deviceId,
        deviceName: m.deviceName,
        platform: m.platform,
        appVersion: m.appVersion,
        lastActive: m.lastActive,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const { action, sessionId, deviceId } = body;

    if (action === "revoke_session" && sessionId) {
      await db.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
      return NextResponse.json({ ok: true, message: "Session revoked." });
    }

    if (action === "revoke_device" && deviceId) {
      await db.mobileSession.updateMany({
        where: { userId: user.id, deviceId },
        data: { isRevoked: true },
      });
      return NextResponse.json({ ok: true, message: "Device revoked." });
    }

    if (action === "logout_all_others") {
      await db.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await db.mobileSession.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
      return NextResponse.json({ ok: true, message: "All other sessions terminated." });
    }

    return NextResponse.json({ ok: false, error: { code: "INVALID_ACTION" } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}