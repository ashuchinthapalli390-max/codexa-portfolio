import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";
import { generateVerificationCode } from "@/lib/cxa-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canManageDocs =
    hasPermission(currentUser, Permission.VIEW_DOCUMENTS) ||
    hasPermission(currentUser, Permission.MANAGE_DOCUMENTS);

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || currentUser.id;
  const typeFilter = url.searchParams.get("type");

  if (!canManageDocs && targetUserId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const whereClause: any = { userId: targetUserId };
    if (typeFilter) {
      whereClause.documentType = typeFilter.toUpperCase();
    }

    const documents = await db.documentItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, documents, isSelfOnly: targetUserId === currentUser.id && !canManageDocs },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: "Failed to load documents." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.MANAGE_DOCUMENTS)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, title, documentType, documentNumber, fileUrl, metadata } = body;

    if (!userId || !title || !documentType) {
      return NextResponse.json({ error: "userId, title, and documentType are required." }, { status: 400 });
    }

    const verificationCode = generateVerificationCode();

    const doc = await db.documentItem.create({
      data: {
        userId,
        title: title.trim(),
        documentType: documentType.toUpperCase(),
        documentNumber: documentNumber ? documentNumber.trim() : null,
        fileUrl: fileUrl || null,
        status: "ACTIVE",
        issuedBy: currentUser.displayName,
        verificationCode,
        metadata: metadata || null,
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: doc.id,
      action: "DOCUMENT_ISSUED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) issued document "${title}" (${documentType}) for user ${userId}. Verification: ${verificationCode}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, document: doc, message: "Document saved to member vault." });
  } catch (err: any) {
    console.error("[POST /api/documents]", err);
    return NextResponse.json({ error: "Failed to save document." }, { status: 500 });
  }
}
