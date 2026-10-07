import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import { getPaymentProofBuffer } from "@/lib/payment-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/proof/[attemptId]
 * Authenticated streaming endpoint for a specific payment attempt's proof screenshot.
 * Authorized for:
 * - Payment owner
 * - Founder / Co-Founder
 * - Privileged management roles with payment view permissions
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, attemptId } = params;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    }

    const isOwner = user.id === payment.userId;
    const canVerify = hasPermission(user, Permission.VERIFY_PAYMENT);
    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);

    if (!isOwner && !canVerify && !canViewAll) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to view this payment proof." },
        { status: 403 }
      );
    }

    const attempt = await db.paymentAttempt.findFirst({
      where: {
        id: attemptId,
        paymentId: payment.id,
      },
      select: {
        id: true,
        proofImageUrl: true,
      },
    });

    if (!attempt || !attempt.proofImageUrl) {
      return NextResponse.json({ error: "Proof screenshot not found for this attempt." }, { status: 404 });
    }

    const fileData = await getPaymentProofBuffer(attempt.proofImageUrl);
    if (!fileData) {
      return NextResponse.json({ error: "Screenshot file not found on storage." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        "Content-Type": fileData.mimeType,
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/proof/[attemptId] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load proof screenshot" },
      { status: 500 }
    );
  }
}
