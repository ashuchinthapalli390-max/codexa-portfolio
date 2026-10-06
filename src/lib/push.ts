import webpush from "web-push";
import { db } from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:security@codxa-agency.online";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error("[WEB PUSH CONFIG ERROR]", err);
  }
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: {
    type?: string;
    url?: string;
    [key: string]: any;
  };
}

export interface PushResult {
  attempted: boolean;
  status: "SENT" | "FAILED" | "UNAVAILABLE";
  sentCount: number;
  failedCount: number;
  error?: string;
}

/**
 * Dispatches a Web Push notification to all active browser subscriptions for a user.
 * Automatically cleans up expired/invalid push subscriptions (HTTP 404 / 410).
 */
export async function sendPushNotification(
  userId: string,
  payload: WebPushPayload
): Promise<PushResult> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return {
      attempted: false,
      status: "UNAVAILABLE",
      sentCount: 0,
      failedCount: 0,
      error: "VAPID credentials not configured",
    };
  }

  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return {
        attempted: false,
        status: "UNAVAILABLE",
        sentCount: 0,
        failedCount: 0,
      };
    }

    const payloadString = JSON.stringify(payload);
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushConfig, payloadString, {
            TTL: 86400, // 24 hours in seconds
            urgency: "high",
          });
          sentCount++;
        } catch (error: any) {
          failedCount++;
          // HTTP 404 or 410 (Gone) indicates the subscription has expired or unsubscribed
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`[PUSH CLEANUP] Removing expired subscription endpoint: ${sub.endpoint}`);
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            errors.push(error.message || `HTTP ${error.statusCode}`);
          }
        }
      })
    );

    if (sentCount > 0) {
      return {
        attempted: true,
        status: "SENT",
        sentCount,
        failedCount,
      };
    } else {
      return {
        attempted: true,
        status: "FAILED",
        sentCount: 0,
        failedCount,
        error: errors.join(", ") || "All push subscriptions failed delivery",
      };
    }
  } catch (error: any) {
    console.error("[PUSH DISPATCH ERROR]", error);
    return {
      attempted: true,
      status: "FAILED",
      sentCount: 0,
      failedCount: 1,
      error: error.message || "Failed to dispatch web push",
    };
  }
}
