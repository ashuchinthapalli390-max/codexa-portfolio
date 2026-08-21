/**
 * /api/notifications
 * GET: Fetch notifications for logged-in user
 * PATCH: Mark single or all notifications as read
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await dataStore.getNotifications(user.id);
    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    });
  } catch (err: any) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await dataStore.markAllNotificationsRead(user.id);
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      await dataStore.markNotificationRead(notificationId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  } catch (err: any) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
  }
}
