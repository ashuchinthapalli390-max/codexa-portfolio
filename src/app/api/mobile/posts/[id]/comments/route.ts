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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ ok: false, error: { code: "EMPTY_COMMENT" } }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: {
        postId: params.id,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: { select: { fullName: true, username: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        content: comment.content,
        authorName: comment.user.fullName || comment.user.username,
        createdAt: comment.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}