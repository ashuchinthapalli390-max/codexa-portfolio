import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/push/subscribe
 * Returns VAPID public key for frontend subscription initialization.
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return NextResponse.json({
    configured: Boolean(publicKey),
    publicKey,
  });
}

/**
 * POST /api/push/subscribe
 * Registers or updates a browser Web Push subscription for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription payload. Must include endpoint, p256dh, and auth keys." },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || null;

    const subscription = await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: "Push notifications registered successfully",
    });
  } catch (error: any) {
    console.error("[PUSH SUBSCRIBE ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register push subscription" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * Removes a browser Web Push subscription.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    await db.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Push subscription removed" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to remove push subscription" },
      { status: 500 }
    );
  }
}
