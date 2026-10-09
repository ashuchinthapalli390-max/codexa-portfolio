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
  const storyId = resolvedParams.id;

  try {
    const viewId = `pv_${storyId}_${user.id}`;
    await db.$executeRawUnsafe(
      `INSERT INTO post_views (id, post_id, user_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (post_id, user_id) DO NOTHING`,
      viewId,
      storyId,
      user.id
    );

    return NextResponse.json({ ok: true, storyId, viewed: true });
  } catch (err: any) {
    console.error("[POST /api/mobile/stories/[id]/view]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
