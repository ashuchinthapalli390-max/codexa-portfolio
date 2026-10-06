/**
 * /api/approvals
 * GET: List approval requests with optional status and type filters (requires Permission.VIEW_APPROVALS)
 * POST: Submit a new approval request
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { Permission, requirePermission, getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const permCheck = await requirePermission(auth.user, Permission.VIEW_APPROVALS);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // "PENDING" | "APPROVED" | "REJECTED"
  const type = url.searchParams.get("type"); // "PROJECT" | "PROFILE" | "STAFF_ACTION" | "PAYMENT"

  try {
    const whereClause: any = {};
    if (status) whereClause.status = status.toUpperCase();
    if (type) whereClause.type = type.toUpperCase();

    const approvals = await db.approvalRequest.findMany({
      where: whereClause,
      orderBy: { requestedAt: "desc" },
    });

    const pendingCount = await db.approvalRequest.count({
      where: { status: "PENDING" },
    });

    return NextResponse.json(
      {
        success: true,
        approvals,
        pendingCount,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/approvals]", err);
    return NextResponse.json({ error: "Failed to load approval requests." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const currentUser = auth.user;

  try {
    const body = await req.json();
    const { type, relatedEntityId, notes, metadata } = body;

    if (!type || !type.trim()) {
      return NextResponse.json({ error: "Approval request type is required." }, { status: 400 });
    }

    const cleanType = type.toUpperCase().trim();

    const approval = await db.approvalRequest.create({
      data: {
        type: cleanType,
        relatedEntityId: relatedEntityId || null,
        requestedBy: currentUser.id,
        requestedByName: currentUser.displayName,
        status: "PENDING",
        notes: notes?.trim() || null,
        metadata: metadata || null,
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: approval.id,
      action: "APPROVAL_REQUESTED",
      details: `${currentUser.displayName} submitted ${cleanType} approval request #${approval.id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      approval,
      message: "Approval request submitted successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/approvals]", err);
    return NextResponse.json({ error: "Failed to submit approval request." }, { status: 500 });
  }
}
