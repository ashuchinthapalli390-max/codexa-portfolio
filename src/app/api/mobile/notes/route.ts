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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rawNotes = await db.post.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: twentyFourHoursAgo },
        content: { startsWith: "[CODEXA_NOTE]" },
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            profileMediaUrl: true,
            profile: {
              select: {
                displayName: true,
                mediaUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // One active note per author (the latest one)
    const seenAuthors = new Set<string>();
    const notes: any[] = [];

    for (const p of rawNotes) {
      if (seenAuthors.has(p.authorId)) continue;
      seenAuthors.add(p.authorId);

      const text = p.content.replace("[CODEXA_NOTE]\n", "").replace("[CODEXA_NOTE]", "").trim();
      const expiresAt = new Date(p.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

      notes.push({
        id: p.id,
        userId: p.authorId,
        userName: p.author.fullName || p.author.profile?.displayName || p.author.username,
        username: p.author.username,
        avatarUrl: p.author.profileMediaUrl || p.author.profile?.mediaUrl || null,
        role: p.author.role,
        text,
        createdAt: p.createdAt.toISOString(),
        expiresAt,
        isSelf: p.authorId === user.id,
      });
    }

    return NextResponse.json({ ok: true, notes }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/mobile/notes error]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load notes." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    let text = (body.text || "").trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Note text cannot be empty." } },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (text.length > 60) {
      text = text.substring(0, 60);
    }

    // Soft-delete any previous active note by this user in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.post.updateMany({
      where: {
        authorId: user.id,
        content: { startsWith: "[CODEXA_NOTE]" },
        createdAt: { gte: twentyFourHoursAgo },
        isDeleted: false,
      },
      data: { isDeleted: true },
    });

    // Create new note
    const created = await db.post.create({
      data: {
        authorId: user.id,
        content: `[CODEXA_NOTE]\n${text}`,
      },
    });

    return NextResponse.json({
      ok: true,
      note: {
        id: created.id,
        userId: created.authorId,
        userName: user.displayName || user.username,
        username: user.username,
        avatarUrl: user.mediaUrl || null,
        role: user.role,
        text,
        createdAt: created.createdAt.toISOString(),
        expiresAt: new Date(created.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        isSelf: true,
      },
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/mobile/notes error]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to publish note." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
