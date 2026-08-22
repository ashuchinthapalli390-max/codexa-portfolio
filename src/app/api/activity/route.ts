import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const activities = await dataStore.getActivityEvents(25);
    return NextResponse.json(
      {
        success: true,
        activities,
        total: activities.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/activity] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load activities." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
