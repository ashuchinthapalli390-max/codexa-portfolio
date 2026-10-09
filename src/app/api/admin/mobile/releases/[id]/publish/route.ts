import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile } from "@/lib/permissions";
import { publishMobileRelease } from "@/lib/apk-releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUser(req: NextRequest) {
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canManageMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Only Founder and Co-Founder can publish releases." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const notifyUsers = body.notifyUsers !== false;

    const actorName = user.displayName || user.username || "Founder";
    const published = await publishMobileRelease({
      releaseId: id,
      publisherId: user.id,
      publisherName: actorName,
      notifyUsers,
    });

    return NextResponse.json({
      success: true,
      release: published,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/mobile/releases/[id]/publish]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to publish release." },
      { status: 500 }
    );
  }
}
