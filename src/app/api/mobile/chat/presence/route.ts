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

/**
 * Updates active conversation presence for a specific device.
 * Used for smart notification suppression when the user is actively viewing a conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { deviceId, conversationId, isActive } = body;

    if (!deviceId) {
      return NextResponse.json({ ok: false, error: "deviceId is required" }, { status: 400 });
    }

    const sessionId = `${user.id}_${deviceId}`;
    const now = new Date();

    await db.mobileSession.upsert({
      where: { id: sessionId },
      update: {
        activeConversationId: isActive ? (conversationId || null) : null,
        activeConversationAt: isActive ? now : null,
        lastActive: now,
      },
      create: {
        id: sessionId,
        userId: user.id,
        deviceId,
        activeConversationId: isActive ? (conversationId || null) : null,
        activeConversationAt: isActive ? now : null,
        lastActive: now,
      },
    });

    return NextResponse.json({
      ok: true,
      deviceId,
      conversationId: isActive ? conversationId : null,
      isActive: Boolean(isActive),
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/chat/presence error]", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to update presence" }, { status: 500 });
  }
}
