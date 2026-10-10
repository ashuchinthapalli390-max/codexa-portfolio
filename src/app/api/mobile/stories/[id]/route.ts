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

export async function DELETE(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const storyId = resolvedParams.id;

  try {
    const post = await db.post.findUnique({
      where: { id: storyId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ ok: false, error: "Story not found" }, { status: 404 });
    }

    const isOwner = post.authorId === user.id;
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "ADMIN"].includes(user.role);

    if (!isOwner && !isLeadership) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    await db.post.update({
      where: { id: storyId },
      data: { isDeleted: true },
    });

    return NextResponse.json({ ok: true, deleted: true, storyId });
  } catch (err: any) {
    console.error("[DELETE /api/mobile/stories/[id]]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
