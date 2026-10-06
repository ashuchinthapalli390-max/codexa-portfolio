import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";
import { generatePublishToken } from "@/lib/cxa-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.PUBLISH_PROJECTS)) {
    return NextResponse.json(
      { error: "Forbidden. Insufficient permissions to issue Project Publish Authorizations." },
      { status: 403 }
    );
  }

  try {
    const { rawToken, tokenHash, expiresAt } = generatePublishToken();

    // Store in PreAuthChallenge or audit
    await db.preAuthChallenge.create({
      data: {
        userId: currentUser.id,
        tokenHash,
        purpose: "PROJECT_PUBLISH",
        expiresAt,
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      action: "PUBLISH_TOKEN_GENERATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) generated 10-minute Project Publish Authorization token.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      publishToken: rawToken,
      expiresAt,
      validMinutes: 10,
      message: "Project Publish Authorization token generated. Valid for 10 minutes.",
    });
  } catch (err: any) {
    console.error("[POST /api/projects/publish-token]", err);
    return NextResponse.json({ error: "Failed to generate publish token." }, { status: 500 });
  }
}
