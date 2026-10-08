import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/settings/notifications/test
 * Dispatches an authentic test Web Push notification to the current user's registered browser(s).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendPushNotification(user.id, {
      title: "CodeXa System Test",
      body: `Web push test dispatch received successfully for ${user.displayName || user.email}.`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `test-notification-${Date.now()}`,
      data: {
        type: "SYSTEM_TEST",
        url: "/dashboard/settings/notifications",
        timestamp: Date.now(),
      },
    });

    if (result.status === "UNAVAILABLE") {
      return NextResponse.json({
        success: false,
        message: result.error || "No active push subscription registered on this account.",
        result,
      });
    }

    if (result.status === "SENT") {
      return NextResponse.json({
        success: true,
        message: `Sent to push service (${result.sentCount} active subscription${result.sentCount > 1 ? "s" : ""})`,
        result,
      });
    }

    return NextResponse.json({
      success: false,
      message: `Delivery failed: ${result.error || "Could not deliver push notification"}`,
      result,
    });
  } catch (error: any) {
    console.error("[TEST PUSH ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to trigger test push notification" },
      { status: 500 }
    );
  }
}
