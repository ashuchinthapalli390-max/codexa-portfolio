import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/settings/notifications/diagnostics
 * Returns push notification system health and subscription analytics.
 * Admin view accessible to FOUNDER, CO_FOUNDER, CEO, CTO, HR, ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = [
      "FOUNDER",
      "CO_FOUNDER",
      "CEO",
      "CTO",
      "HR",
      "ADMIN",
    ].includes(user.role?.toUpperCase() || "");

    const vapidConfigured = Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    );

    // Current user's registered devices
    const userSubscriptions = await db.pushSubscription.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    const basicData = {
      vapidConfigured,
      vapidSubject: process.env.VAPID_SUBJECT || "mailto:security@codxa-agency.online",
      currentUserDeviceCount: userSubscriptions.length,
      currentUserSubscriptions: userSubscriptions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        userAgent: s.userAgent || "Unknown Browser",
        endpointHost: (() => {
          try {
            return new URL(s.endpoint).host;
          } catch {
            return "push-service";
          }
        })(),
      })),
      isAdmin,
    };

    if (!isAdmin) {
      return NextResponse.json({ success: true, ...basicData });
    }

    // Extended diagnostics for executive/founder roles
    const totalSubscriptions = await db.pushSubscription.count();
    const uniqueUsers = await db.pushSubscription.groupBy({
      by: ["userId"],
      _count: { userId: true },
    });

    const recentSubs = await db.pushSubscription.findMany({
      take: 15,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      ...basicData,
      adminDiagnostics: {
        totalSubscriptions,
        uniqueSubscribedUsersCount: uniqueUsers.length,
        recentSubscriptions: recentSubs.map((s) => ({
          id: s.id,
          userName: s.user.fullName || s.user.username || "User",
          userEmail: s.user.email,
          userRole: s.user.role,
          userAgent: s.userAgent || "Unknown Browser",
          updatedAt: s.updatedAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
          endpointHost: (() => {
            try {
              return new URL(s.endpoint).host;
            } catch {
              return "push-service";
            }
          })(),
        })),
      },
    });
  } catch (error: any) {
    console.error("[PUSH DIAGNOSTICS ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load push diagnostics" },
      { status: 500 }
    );
  }
}
