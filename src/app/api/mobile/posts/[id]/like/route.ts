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

    const postId = params.id;
    const existing = await db.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    if (existing) {
      await db.postLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, liked: false });
    } else {
      await db.postLike.create({
        data: { postId, userId: user.id },
      });
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}