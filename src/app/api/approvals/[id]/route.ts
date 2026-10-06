/**
 * /api/approvals/[id]
 * PATCH: Decide approval request (APPROVED or REJECTED)
 * Enforces Permission.DECIDE_APPROVALS, applies side effects, and records audit logs.
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const permCheck = await requirePermission(auth.user, Permission.DECIDE_APPROVALS);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  const currentUser = auth.user;
  const { id } = params;

  try {
    const body = await req.json();
    const { decision, reason, notes } = body;

    if (!decision || !["APPROVED", "REJECTED"].includes(decision.toUpperCase())) {
      return NextResponse.json({ error: "Decision must be APPROVED or REJECTED." }, { status: 400 });
    }

    const approval = await db.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval) {
      return NextResponse.json({ error: "Approval request not found." }, { status: 404 });
    }

    const cleanDecision = decision.toUpperCase();
    const now = new Date();

    const updatedApproval = await db.approvalRequest.update({
      where: { id },
      data: {
        status: cleanDecision,
        decidedBy: currentUser.id,
        decidedByName: currentUser.displayName,
        decidedAt: now,
        reason: reason?.trim() || null,
        notes: notes?.trim() || approval.notes,
      },
    });

    // Side-effects execution if Approved
    if (cleanDecision === "APPROVED") {
      if (approval.type === "PROJECT" && approval.relatedEntityId) {
        // Approve project in database
        await db.project.update({
          where: { id: approval.relatedEntityId },
          data: {
            isDraft: false,
            status: "Live",
            isHomepageVisible: true,
          },
        }).catch((e) => console.warn("[Project Approval side-effect warning]", e?.message));
      }
    }

    // Audit log
    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: approval.id,
      action: cleanDecision === "APPROVED" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
      details: `${currentUser.displayName} (${getEffectiveRole(currentUser)}) marked ${approval.type} request #${approval.id} as ${cleanDecision}. Reason: ${reason || "N/A"}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      approval: updatedApproval,
      message: `Approval request #${id} marked as ${cleanDecision}.`,
    });
  } catch (err: any) {
    console.error("[PATCH /api/approvals/[id]]", err);
    return NextResponse.json({ error: "Failed to update approval decision." }, { status: 500 });
  }
}
