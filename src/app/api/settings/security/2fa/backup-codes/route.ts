import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { generateBackupCodes } from "@/lib/totp";

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
      remainingCodes: config.remainingBackupCodes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to retrieve backup codes status." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { password, totpCode } = await req.json();

    if (!password || !totpCode) {
      return NextResponse.json({ error: "Current password and authenticator code are required." }, { status: 400 });
    }

    const profile = await dataStore.getProfileById(user.id);
    if (!profile || !profile.passwordHash) {
      return NextResponse.json({ error: "Profile not found." }, { status: 400 });
    }

    // 1. Verify password
    const isPasswordValid = await bcrypt.compare(password, profile.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    // 2. Verify TOTP
    const isTotpValid = await dataStore.verifyTwoFactorTotp(user.id, totpCode);
    if (!isTotpValid) {
      return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
    }

    // 3. Generate 10 new codes
    const { plaintextCodes, hashedCodes } = generateBackupCodes(10);

    // 4. Save to database
    await dataStore.regenerateBackupCodes(user.id, hashedCodes);

    await dataStore.logAudit({
      action: "BACKUP_CODES_REGENERATED",
      actorId: user.id,
      details: "Regenerated 10 fresh single-use backup codes.",
    });

    return NextResponse.json({
      success: true,
      message: "10 new backup codes generated. Previous codes have been invalidated.",
      backupCodes: plaintextCodes,
    });

  } catch (error: any) {
    console.error("Regenerate Backup Codes Error:", error);
    return NextResponse.json({ error: "Failed to regenerate backup codes." }, { status: 500 });
  }
}
