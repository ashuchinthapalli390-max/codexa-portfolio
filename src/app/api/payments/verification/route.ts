import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/verification
 * Returns the queue of payments awaiting manual verification.
 * Requires VERIFY_PAYMENT permission.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.VERIFY_PAYMENT)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to verify payments." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const purpose = searchParams.get("purpose");
    const query = searchParams.get("q")?.trim();

    const where: any = {
      paymentStatus: "PENDING_VERIFICATION",
    };

    if (purpose && purpose !== "ALL") {
      where.paymentPurpose = purpose;
    }

    if (query) {
      where.OR = [
        { referenceId: { contains: query, mode: "insensitive" } },
        { userName: { contains: query, mode: "insensitive" } },
        { userEmail: { contains: query, mode: "insensitive" } },
        { internId: { contains: query, mode: "insensitive" } },
        { employeeId: { contains: query, mode: "insensitive" } },
        { utrNumber: { contains: query, mode: "insensitive" } },
      ];
    }

    const pendingQueue = await db.paymentRequest.findMany({
      where,
      orderBy: { submittedAt: "asc" }, // Oldest pending first
      include: {
        paymentAccount: {
          select: { name: true, upiId: true },
        },
        submissions: {
          orderBy: { submissionNumber: "desc" },
          take: 1,
        },
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
            department: true,
            employmentProfile: {
              select: {
                employeeId: true,
                designation: true,
                department: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      count: pendingQueue.length,
      queue: pendingQueue,
    });
  } catch (error: any) {
    console.error("GET /api/payments/verification error:", error);
    return NextResponse.json({ error: error.message || "Failed to load verification queue" }, { status: 500 });
  }
}
