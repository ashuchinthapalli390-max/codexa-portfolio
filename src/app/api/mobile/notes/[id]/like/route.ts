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

export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const noteId = resolvedParams.id;

  try {
    const existing = await db.postLike.findUnique({
      where: { postId_userId: { postId: noteId, userId: user.id } },
    });

    if (existing) {
      await db.postLike.delete({ where: { id: existing.id } });
      const count = await db.postLike.count({ where: { postId: noteId } });
      return NextResponse.json({ ok: true, liked: false, likesCount: count });
    } else {
      await db.postLike.create({
        data: { postId: noteId, userId: user.id },
      });
      const count = await db.postLike.count({ where: { postId: noteId } });
      return NextResponse.json({ ok: true, liked: true, likesCount: count });
    }
  } catch (err: any) {
    console.error("[POST /api/mobile/notes/[id]/like]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
