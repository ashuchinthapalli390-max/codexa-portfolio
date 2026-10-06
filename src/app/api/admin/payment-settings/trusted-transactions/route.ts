import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { addTrustedTransaction, logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFounderOrCoFounder(user: any): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return role === "FOUNDER" || role === "CO_FOUNDER";
}

/**
 * POST /api/admin/payment-settings/trusted-transactions
 * Founder & Co-Founder access only.
 * Ingests a verified settlement or bank feed record into TrustedUpiTransaction.
 * Allows instant automated reconciliation testing and production bank feed ingestion.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFounderOrCoFounder(user)) {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can ingest trusted bank transactions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { utrNumber, amount, receiverUpi, senderName, bankReference } = body;

    if (!utrNumber || !amount || !receiverUpi) {
      return NextResponse.json(
        { error: "utrNumber, amount, and receiverUpi are required fields" },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid transaction amount" },
        { status: 400 }
      );
    }

    const transaction = await addTrustedTransaction({
      utrNumber,
      amount: parsedAmount,
      receiverUpi,
      senderName,
      bankReference,
    });

    await logPaymentAudit({
      action: "TRUSTED_BANK_TRANSACTION_INGESTED",
      actorId: user.id,
      actorName: user.displayName || user.username || "Admin",
      targetId: transaction.id,
      details: {
        utrNumber: transaction.utrNumber,
        amount: Number(transaction.amount),
        receiverUpi: transaction.receiverUpi,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Trusted bank transaction ingested successfully",
      transaction: {
        ...transaction,
        amount: Number(transaction.amount),
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/payment-settings/trusted-transactions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest trusted bank transaction" },
      { status: 500 }
    );
  }
}
