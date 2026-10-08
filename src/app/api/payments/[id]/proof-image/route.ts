import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { getPaymentProofBuffer } from "@/lib/payment-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/proof-image
 * Authenticated streaming endpoint for sensitive payment proof screenshots.
 * Enforces ownership or Founder/Co-Founder/admin verification permissions.
 * Never exposes screenshots publicly.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      select: {
        id: true,
        referenceId: true,
        userId: true,
        proofImageUrl: true,
        proofImageMimeType: true,
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            proofImageUrl: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    }

    const proofPath =
      payment.proofImageUrl || payment.attempts.find((a) => a.proofImageUrl)?.proofImageUrl;

    if (!proofPath) {
      return NextResponse.json({ error: "Proof screenshot not found for this payment." }, { status: 404 });
    }

    const role = getEffectiveRole(user);
    const isOwner = user.id === payment.userId;
    const isFounderOrCoFounder =
      role === "FOUNDER" ||
      role === "CO_FOUNDER" ||
      role === "OWNER" ||
      user.email === "ashuchinthapalli3900@gmail.com" ||
      user.email === "boddukurisanjay@gmail.com";
    const canVerify = hasPermission(user, Permission.VERIFY_PAYMENT);
    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);

    if (!isOwner && !isFounderOrCoFounder && !canVerify && !canViewAll) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to view this payment proof." },
        { status: 403 }
      );
    }

    const fileData = await getPaymentProofBuffer(proofPath);
    if (!fileData) {
      return NextResponse.json({ error: "Screenshot file not found on storage." }, { status: 404 });
    }

    const ext = fileData.mimeType.includes("png")
      ? "png"
      : fileData.mimeType.includes("webp")
      ? "webp"
      : "jpg";

    return new NextResponse(new Uint8Array(fileData.buffer), {
      status: 200,
      headers: {
        "Content-Type": fileData.mimeType || "image/jpeg",
        "Content-Length": String(fileData.buffer.length),
        "Content-Disposition": `inline; filename="CodeXa_Proof_${payment.referenceId || payment.id}.${ext}"`,
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/proof-image error:", error);
    return NextResponse.json({ error: error.message || "Failed to load proof image" }, { status: 500 });
  }
}
