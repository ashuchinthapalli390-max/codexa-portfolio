import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  try {
    const settings = await dataStore.getSiteSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch site settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Owner privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = await dataStore.updateSiteSettings(body);

    await dataStore.logAudit(
      "SITE_SETTINGS_UPDATED",
      user.id,
      `Homepage visibility updated: Main Projects [${updated.mainProjectsHomeVisible ? "ON" : "OFF"}], Team Projects [${updated.teamProjectsHomeVisible ? "ON" : "OFF"}]`
    );

    return NextResponse.json({
      success: true,
      settings: updated,
      message: "Site visibility settings updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to update site settings." },
      { status: 500 }
    );
  }
}
