import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activities = await dataStore.getActivityEvents(25);
    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (err: any) {
    console.error("[GET /api/activity] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to load activities." }, { status: 500 });
  }
}
