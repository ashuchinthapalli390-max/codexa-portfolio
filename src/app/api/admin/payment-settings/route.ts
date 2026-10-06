import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getPaymentSettings, logPaymentAudit } from "@/lib/payments/automated-upi";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFounderOrCoFounder(user: any): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return role === "FOUNDER" || role === "CO_FOUNDER";
}

/**
 * GET /api/admin/payment-settings
 * Founder & Co-Founder access only.
 * Returns global payment destination settings, active bank reconciliation stats,
 * and trusted transaction feed entries.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFounderOrCoFounder(user)) {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can access payment settings." },
        { status: 403 }
      );
    }

    const settings = await getPaymentSettings();

    // Fetch trusted transactions feed stats & recent items
    const [totalTrustedTx, unconsumedCount, recentTrustedTx] = await Promise.all([
      db.trustedUpiTransaction.count(),
      db.trustedUpiTransaction.count({ where: { consumedByPaymentId: null } }),
      db.trustedUpiTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        fixedInternshipAmount: Number(settings.fixedInternshipAmount || 450),
      },
      trustedFeedStats: {
        total: totalTrustedTx,
        unconsumed: unconsumedCount,
        recent: recentTrustedTx,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/payment-settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load payment settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/payment-settings
 * Founder & Co-Founder access only.
 * Updates payment receiver details, method toggles, fixed amounts, and security thresholds.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFounderOrCoFounder(user)) {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can edit payment settings." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updateData: any = {};

    if (body.receiverName !== undefined) {
      updateData.receiverName = body.receiverName.trim();
      updateData.upiDisplayName = body.receiverName.trim();
    }
    if (body.upiId !== undefined) {
      updateData.upiId = body.upiId.trim();
      updateData.defaultUpiId = body.upiId.trim();
    }
    if (body.qrCodeUrl !== undefined) {
      updateData.qrCodeUrl = body.qrCodeUrl;
    }
    if (body.phonePeEnabled !== undefined) {
      updateData.phonePeEnabled = Boolean(body.phonePeEnabled);
    }
    if (body.googlePayEnabled !== undefined) {
      updateData.googlePayEnabled = Boolean(body.googlePayEnabled);
    }
    if (body.paytmEnabled !== undefined) {
      updateData.paytmEnabled = Boolean(body.paytmEnabled);
    }
    if (body.otherUpiEnabled !== undefined) {
      updateData.otherUpiEnabled = Boolean(body.otherUpiEnabled);
    }
    if (body.proofWindowMinutes !== undefined) {
      updateData.proofWindowMinutes = Math.max(1, Math.min(60, Number(body.proofWindowMinutes)));
    }
    if (body.clockToleranceSeconds !== undefined) {
      updateData.clockToleranceSeconds = Math.max(0, Math.min(600, Number(body.clockToleranceSeconds)));
    }
    if (body.systemEnabled !== undefined) {
      updateData.systemEnabled = Boolean(body.systemEnabled);
    }
    if (body.verificationProvider !== undefined) {
      updateData.verificationProvider = body.verificationProvider;
    }
    if (body.paymentInstructions !== undefined) {
      updateData.paymentInstructions = body.paymentInstructions;
    }
    if (body.fixedInternshipAmount !== undefined) {
      const parsedAmount = Number(body.fixedInternshipAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid fixed internship amount" },
          { status: 400 }
        );
      }
      updateData.fixedInternshipAmount = new Prisma.Decimal(parsedAmount.toFixed(2));
    }

    updateData.updatedById = user.id;

    const updated = await db.paymentSetting.upsert({
      where: { id: "cxa_payment_settings" },
      update: updateData,
      create: {
        id: "cxa_payment_settings",
        ...updateData,
      },
    });

    await logPaymentAudit({
      action: "PAYMENT_SETTINGS_UPDATED",
      actorId: user.id,
      actorName: user.displayName || user.username || "Admin",
      targetId: "cxa_payment_settings",
      details: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Payment settings updated successfully",
      settings: {
        ...updated,
        fixedInternshipAmount: Number(updated.fixedInternshipAmount),
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/payment-settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
