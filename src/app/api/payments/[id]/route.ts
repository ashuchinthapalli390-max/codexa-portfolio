import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]
 * Retrieves details of a specific payment request.
 * Authorized for:
 * - The owner user (userId === user.id)
 * - Users with VIEW_ALL_PAYMENTS or VERIFY_PAYMENT permission.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Search by ID or Reference ID
    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        paymentAccount: true,
        submissions: {
          orderBy: { submissionNumber: "desc" },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
            orgRole: true,
            department: true,
            employmentProfile: {
              select: {
                employeeId: true,
                designation: true,
                department: true,
                joiningDate: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    const isOwner = user.id === payment.userId;
    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);
    const canVerify = hasPermission(user, Permission.VERIFY_PAYMENT);

    if (!isOwner && !canViewAll && !canVerify) {
      return NextResponse.json({ error: "Forbidden: You cannot view this payment" }, { status: 403 });
    }

    // ─── ADMIN CHECKS: DUPLICATE UTR & SCREENSHOT HASH ────────────────────────
    let duplicateWarnings: { duplicateUtr?: boolean; duplicateScreenshot?: boolean; conflictingReference?: string } = {};

    if (canVerify || canViewAll) {
      // Check duplicate UTR
      if (payment.utrNumber) {
        const dupUtr = await db.paymentRequest.findFirst({
          where: {
            id: { not: payment.id },
            utrNumber: payment.utrNumber,
            paymentStatus: { in: ["APPROVED", "PENDING_VERIFICATION"] },
          },
          select: { referenceId: true },
        });

        if (dupUtr) {
          duplicateWarnings.duplicateUtr = true;
          duplicateWarnings.conflictingReference = dupUtr.referenceId;
        }
      }

      // Check duplicate screenshot hash
      if (payment.proofImageHash) {
        const dupHash = await db.paymentRequest.findFirst({
          where: {
            id: { not: payment.id },
            proofImageHash: payment.proofImageHash,
          },
          select: { referenceId: true },
        });

        if (dupHash) {
          duplicateWarnings.duplicateScreenshot = true;
          duplicateWarnings.conflictingReference = duplicateWarnings.conflictingReference || dupHash.referenceId;
        }
      }
    }

    // Return official payment record
    return NextResponse.json({
      payment,
      duplicateWarnings,
      isOwner,
      canVerify,
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to load payment" }, { status: 500 });
  }
}

/**
 * PATCH /api/payments/[id]
 * Updates payment request parameters (e.g. notes, due date, description).
 * Requires EDIT_PAYMENT permission.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.EDIT_PAYMENT)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit payments" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { dueDate, adminNotes, description, title } = body;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updated = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        dueDate: dueDate ? new Date(dueDate) : payment.dueDate,
        adminNotes: adminNotes !== undefined ? adminNotes : payment.adminNotes,
        description: description !== undefined ? description : payment.description,
        title: title !== undefined ? title : payment.title,
      },
    });

    await dataStore.logAudit(user.id, "PAYMENT_UPDATED", `Updated payment request ${payment.referenceId}`);

    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    console.error("PATCH /api/payments/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update payment" }, { status: 500 });
  }
}
