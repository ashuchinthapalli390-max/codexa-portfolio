import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const preferences = await dataStore.getNotificationPreferences(user.id);
    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load notification preferences." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const updated = await dataStore.updateNotificationPreferences(user.id, body);

    return NextResponse.json({
      success: true,
      message: "Preferences updated.",
      preferences: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update notification preferences." }, { status: 500 });
  }
}
