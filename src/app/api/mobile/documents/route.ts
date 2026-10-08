import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId") || user.id;

    // Check permission to view another user's documents
    const callerRole = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(callerRole);

    const queryUserId = isLeadership && targetUserId ? targetUserId : user.id;

    const documents = await db.documentItem.findMany({
      where: { userId: queryUserId, status: "ACTIVE" },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        documentType: d.documentType,
        documentNumber: d.documentNumber,
        fileUrl: d.fileUrl || `https://codxa-agency.online/api/documents/${d.id}/view`,
        status: d.status,
        issuedBy: d.issuedBy || "CodeXa Agency",
        issuedAt: d.issuedAt.toISOString(),
        verificationCode: d.verificationCode,
        metadata: d.metadata,
      })),
      requestId,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/mobile/documents error]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load documents." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const callerRole = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "HR", "OWNER", "ADMIN"].includes(callerRole);

    const body = await req.json();
    const { title, documentType = "SUPPORTING_DOCUMENT", fileBase64, fileName, targetUserId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Document title is required." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Official docs can only be uploaded by leadership
    const officialTypes = ["OFFER_LETTER", "ID_CARD", "PAYSLIP", "INTERNSHIP_CERTIFICATE", "COMPLETION_CERTIFICATE", "EXPERIENCE_CERTIFICATE", "NDA", "AGREEMENT"];
    if (officialTypes.includes(documentType) && !isLeadership) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Only leadership/HR can issue official documents." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const assignedUserId = isLeadership && targetUserId ? targetUserId : user.id;

    let savedFileUrl: string | null = null;
    if (fileBase64 && fileName) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "documents", assignedUserId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const fullPath = path.join(uploadDir, safeName);
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
      fs.writeFileSync(fullPath, Buffer.from(cleanBase64, "base64"));
      savedFileUrl = `/uploads/documents/${assignedUserId}/${safeName}`;
    }

    const docNumber = `CXA-DOC-${Date.now().toString().slice(-6)}`;
    const verificationCode = `VER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const doc = await db.documentItem.create({
      data: {
        userId: assignedUserId,
        title: title.trim(),
        documentType,
        documentNumber: docNumber,
        fileUrl: savedFileUrl,
        status: "ACTIVE",
        issuedBy: isLeadership ? (user.displayName || user.username) : "Self Submitted",
        issuedAt: new Date(),
        verificationCode,
        metadata: {
          uploadedByRole: callerRole,
          originalFileName: fileName || null,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Document uploaded successfully.",
      document: {
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber,
        fileUrl: doc.fileUrl,
        status: doc.status,
        issuedAt: doc.issuedAt.toISOString(),
      },
      requestId,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/mobile/documents error]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to upload document." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}