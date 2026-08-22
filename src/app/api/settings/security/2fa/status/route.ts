import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const config = await dataStore.getUserTwoFactorConfig(user.id);
    return NextResponse.json({
      success: true,
      enabled: config.enabled,
      verifiedAt: config.verifiedAt,
      remainingBackupCodes: config.remainingBackupCodes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load 2FA status." }, { status: 500 });
  }
}
