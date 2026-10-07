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

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        category: n.type,
        title: n.title,
        body: n.message,
        route: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt,
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
    const { notificationId, markAll } = body;

    if (markAll) {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ ok: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: { code: "MISSING_ID" } }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}