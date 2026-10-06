import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";
import { generatePayslipNumber } from "@/lib/cxa-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;
  const currentUser = auth.user;

  try {
    const record = await db.payrollRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            orgRole: true,
            employmentProfile: true,
          },
        },
        payslips: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Payroll record not found." }, { status: 404 });
    }

    const canViewAll =
      hasPermission(currentUser, Permission.VIEW_PAYROLL) ||
      hasPermission(currentUser, Permission.VIEW_PAYMENTS);

    if (!canViewAll && record.userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ success: true, record }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/payroll/:id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;
  const currentUser = auth.user;
  const actorRole = getEffectiveRole(currentUser);

  try {
    const body = await req.json();
    const { action } = body;

    const existingRecord = await db.payrollRecord.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Payroll record not found." }, { status: 404 });
    }

    // Workflow Actions:
    // 1. HR VERIFICATION
    if (action === "verify") {
      if (!hasPermission(currentUser, Permission.VERIFY_PAYMENTS)) {
        return NextResponse.json(
          { error: "Forbidden. Insufficient permissions to verify payments." },
          { status: 403 }
        );
      }

      const updated = await db.payrollRecord.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedBy: currentUser.displayName,
          verifiedAt: new Date(),
          notes: body.notes ? `${existingRecord.notes || ""}\nVerified: ${body.notes}`.trim() : existingRecord.notes,
        },
      });

      const payeeName = existingRecord.user.fullName || existingRecord.user.username;

      await dataStore.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        targetId: id,
        action: "PAYMENT_VERIFIED",
        details: `${actorRole} (${currentUser.displayName}) verified payment entry of ₹${updated.netAmount} for ${payeeName}.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, record: updated, message: "Payment verified successfully." });
    }

    // 2. FOUNDER / CO-FOUNDER FINAL APPROVAL
    if (action === "approve") {
      if (!hasPermission(currentUser, Permission.APPROVE_PAYMENTS)) {
        return NextResponse.json(
          { error: "Forbidden. Insufficient permissions to approve payments." },
          { status: 403 }
        );
      }

      const updated = await db.payrollRecord.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: currentUser.displayName,
          approvedAt: new Date(),
        },
      });

      const payeeName = existingRecord.user.fullName || existingRecord.user.username;

      await dataStore.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        targetId: id,
        action: "PAYMENT_APPROVED",
        details: `${actorRole} (${currentUser.displayName}) approved payment entry of ₹${updated.netAmount} for ${payeeName}.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, record: updated, message: "Payment approved." });
    }

    // 3. COMPLETE DISBURSEMENT / MARK AS PAID & GENERATE PAYSLIP
    if (action === "pay") {
      if (!hasPermission(currentUser, Permission.APPROVE_PAYMENTS) && !hasPermission(currentUser, Permission.MANAGE_PAYROLL)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const txnRef = body.transactionRef || `TXN-CXA-${Date.now().toString(36).toUpperCase()}`;

      const updated = await db.payrollRecord.update({
        where: { id },
        data: {
          status: "PAID",
          paymentDate: new Date(),
          transactionRef: txnRef,
        },
      });

      // Auto-generate payslip record
      let slip = await db.payslip.findFirst({
        where: { payrollRecordId: id },
      });

      if (!slip) {
        const slipNum = await generatePayslipNumber(updated.month, updated.year);
        slip = await db.payslip.create({
          data: {
            payrollRecordId: id,
            userId: updated.userId,
            slipNumber: slipNum,
            period: updated.period,
            grossAmount: updated.basicAmount + updated.allowances + updated.bonus,
            deductions: updated.deductions,
            netAmount: updated.netAmount,
            status: "ISSUED",
          },
        });
      }

      const payeeName = existingRecord.user.fullName || existingRecord.user.username;

      await dataStore.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        targetId: id,
        action: "PAYMENT_EXECUTED",
        details: `${actorRole} (${currentUser.displayName}) marked payment as PAID for ${payeeName} (Ref: ${txnRef}, Payslip: ${slip.slipNumber}).`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        record: updated,
        payslip: slip,
        message: "Payment recorded as PAID and payslip generated.",
      });
    }

    // 4. GENERAL EDIT (Requires MANAGE_PAYROLL)
    if (action === "update") {
      if (!hasPermission(currentUser, Permission.MANAGE_PAYROLL)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const basicNum = body.basicAmount !== undefined ? parseFloat(body.basicAmount) : existingRecord.basicAmount;
      const allowNum = body.allowances !== undefined ? parseFloat(body.allowances) : existingRecord.allowances;
      const bonusNum = body.bonus !== undefined ? parseFloat(body.bonus) : existingRecord.bonus;
      const dedNum = body.deductions !== undefined ? parseFloat(body.deductions) : existingRecord.deductions;
      const netAmount = Math.max(0, basicNum + allowNum + bonusNum - dedNum);

      const updated = await db.payrollRecord.update({
        where: { id },
        data: {
          basicAmount: basicNum,
          allowances: allowNum,
          bonus: bonusNum,
          deductions: dedNum,
          netAmount,
          status: body.status || existingRecord.status,
          dueDate: body.dueDate ? new Date(body.dueDate) : existingRecord.dueDate,
          notes: body.notes !== undefined ? body.notes : existingRecord.notes,
        },
      });

      return NextResponse.json({ success: true, record: updated, message: "Payroll record updated." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("[PATCH /api/payroll/:id]", err);
    return NextResponse.json({ error: "Failed to update payroll record." }, { status: 500 });
  }
}
