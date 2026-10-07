import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_TARGET_USER", message: "Target user ID is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_TARGET", message: "Cannot create direct message with yourself." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Verify target user exists and is active
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ ok: false, error: { code: "USER_NOT_FOUND", message: "Target user is unavailable or inactive." } }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Check if a DIRECT conversation already exists between these two users
    const existingConv = await db.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: user.id } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true } },
          },
        },
      },
    });

    if (existingConv) {
      return NextResponse.json({
        ok: true,
        conversationId: existingConv.id,
        isNew: false,
        conversation: {
          id: existingConv.id,
          type: "DIRECT",
          peer: {
            id: targetUser.id,
            name: targetUser.fullName || targetUser.username,
            username: targetUser.username,
            role: targetUser.role,
            avatarUrl: targetUser.profileMediaUrl,
          },
        },
      }, { headers: NO_CACHE_HEADERS });
    }

    // Atomically create direct conversation
    const newConv = await db.conversation.create({
      data: {
        type: "DIRECT",
        title: `${user.username || "User"} & ${targetUser.username}`,
        createdBy: user.id,
        members: {
          create: [
            { userId: user.id },
            { userId: targetUserId },
          ],
        },
      },
    });

    return NextResponse.json({
      ok: true,
      conversationId: newConv.id,
      isNew: true,
      conversation: {
        id: newConv.id,
        type: "DIRECT",
        peer: {
          id: targetUser.id,
          name: targetUser.fullName || targetUser.username,
          username: targetUser.username,
          role: targetUser.role,
          avatarUrl: targetUser.profileMediaUrl,
        },
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/chat/direct] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to open direct conversation." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
