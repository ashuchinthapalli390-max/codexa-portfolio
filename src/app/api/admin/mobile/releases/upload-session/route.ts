import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile } from "@/lib/permissions";
import { createApkUploadSession, MAX_APK_FILE_SIZE_BYTES, MAX_APK_FILE_SIZE_LABEL } from "@/lib/apk-storage";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!canManageMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Only Founder and Co-Founder can upload APK releases." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { channel = "stable", versionName, versionCode, fileName, fileSize } = body;

    if (!versionName || typeof versionName !== "string") {
      return NextResponse.json({ error: "Version name is required (e.g. 1.0.5)." }, { status: 400 });
    }

    const parsedCode = parseInt(String(versionCode), 10);
    if (isNaN(parsedCode) || parsedCode <= 0) {
      return NextResponse.json({ error: "Valid integer version code is required (e.g. 105)." }, { status: 400 });
    }

    if (fileName && !fileName.toLowerCase().endsWith(".apk")) {
      return NextResponse.json({ error: "Only Android APK files (.apk) are accepted." }, { status: 400 });
    }

    if (fileSize && fileSize > MAX_APK_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `APK file size exceeds maximum limit of ${MAX_APK_FILE_SIZE_LABEL}.` }, { status: 400 });
    }

    const session = await createApkUploadSession({
      channel: channel.toUpperCase() === "BETA" ? "beta" : "stable",
      versionName: versionName.trim(),
      versionCode: parsedCode,
      fileName: fileName ? fileName.trim() : `codexa-${versionName}.apk`,
    });

    const actorName = user.displayName || user.username || "Founder";
    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: session.storageKey,
      action: "MOBILE_APP_UPLOAD_SESSION_CREATED",
      details: `Generated cloud upload session for APK v${versionName} (Build ${parsedCode}, Channel: ${channel}).`,
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/mobile/releases/upload-session]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate upload session." },
      { status: 500 }
    );
  }
}
