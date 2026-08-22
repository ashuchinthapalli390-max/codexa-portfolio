/**
 * /api/notifications
 * GET: Fetch notifications for logged-in user
 * PATCH: Mark single or all notifications as read
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const user = auth.user;

  try {
    const result = await dataStore.getNotifications(user.id);
    return NextResponse.json(
      {
        success: true,
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Failed to load notifications from database." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const user = auth.user;

  try {
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await dataStore.markAllNotificationsRead(user.id);
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (notificationId) {
      await dataStore.markNotificationRead(notificationId);
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ error: "Invalid parameters." }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
