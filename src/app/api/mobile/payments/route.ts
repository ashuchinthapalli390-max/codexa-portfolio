import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
import { hasPermission, Permission, getEffectiveRole, canApproveCashPayment } from "@/lib/permissions";
import { getPaymentSettings } from "@/lib/payments/automated-upi";

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
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const effectiveRole = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(effectiveRole);
    const isFullAdmin = effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER" || effectiveRole === "OWNER";
    const canApproveCash = canApproveCashPayment(user);
    const canViewAll = isLeadership || hasPermission(user, Permission.VIEW_ALL_PAYMENTS);

    // Fetch user's own status
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { internServicePaymentPaid: true, role: true },
    });

    const ownPayment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const isOwnPaid = ownPayment?.paymentStatus === "APPROVED" || ownPayment?.paymentStatus === "SUCCESS" || ownPayment?.cashStatus === "CASH_RECEIVED" || Boolean(fullUser?.internServicePaymentPaid);
    const latestAttempt = ownPayment?.attempts?.[0] || null;

    // Load server payment settings
    const settings = await getPaymentSettings().catch(() => null);

    const ownPaymentData = {
      title: "Internship Service Bill",
      totalAmount: 450,
      currency: "INR",
      items: [
        { name: "Mandatory Student ID Card", amount: 150 },
        { name: "AI Development Tools Pack", amount: 300 },
      ],
      status: isOwnPaid ? "SUCCESSFUL" : (ownPayment?.cashStatus === "PENDING_CASH_APPROVAL" ? "PENDING_CASH_APPROVAL" : (ownPayment?.paymentStatus || "PENDING")),
      cashStatus: ownPayment?.cashStatus || "NONE",
      referenceId: ownPayment?.referenceId || `CXA-PAY-${(user.username || user.id.slice(-6)).toUpperCase()}-450`,
      utrNumber: ownPayment?.utrNumber || null,
      verifiedAt: ownPayment?.verifiedAt || null,
      activeAttempt: latestAttempt ? {
        id: latestAttempt.id,
        status: latestAttempt.status,
        selectedMethod: latestAttempt.selectedMethod,
        startedAt: latestAttempt.startedAt,
        expiresAt: latestAttempt.expiresAt,
        upiId: latestAttempt.upiIdSnapshot,
        receiverName: latestAttempt.receiverSnapshot,
        utrNumber: latestAttempt.utrNumber || latestAttempt.detectedUtr || null,
        proofImageUrl: latestAttempt.proofImageUrl || null,
      } : null,
      settings: {
        phonePeEnabled: (settings as any)?.phonePeEnabled ?? true,
        googlePayEnabled: (settings as any)?.googlePayEnabled ?? true,
        paytmEnabled: (settings as any)?.paytmEnabled ?? true,
        otherUpiEnabled: (settings as any)?.otherUpiEnabled ?? true,
        cashEnabled: (settings as any)?.cashEnabled ?? true,
        receiverName: (settings as any)?.receiverName || "CodeXa Agency",
        defaultUpiId: (settings as any)?.defaultUpiId || "shaikashu33@fam",
        coFounderWhatsApp: (settings as any)?.coFounderWhatsApp || "7075920852",
      },
    };

    // If not management, return personal payment view only
    if (!canViewAll) {
      return NextResponse.json({
        ok: true,
        isManagement: false,
        payment: ownPaymentData,
      }, { headers: NO_CACHE_HEADERS });
    }

    // ── Management View (Founder, Co-Founder, CEO, CTO, HR) ──
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const query = searchParams.get("q")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statusFilter !== "ALL") {
      switch (statusFilter) {
        case "PAID":
        case "SUCCESS":
          where.OR = [
            { paymentStatus: { in: ["APPROVED", "SUCCESS"] } },
            { cashStatus: "CASH_RECEIVED" },
          ];
          break;
        case "NOT_PAID":
          where.paymentStatus = { notIn: ["APPROVED", "SUCCESS"] };
          where.cashStatus = { not: "CASH_RECEIVED" };
          break;
        case "PENDING":
          where.paymentStatus = { in: ["PENDING_PAYMENT", "PAYMENT_STARTED"] };
          where.cashStatus = { not: "PENDING_CASH_APPROVAL" };
          break;
        case "UPI_VERIFYING":
        case "REVIEW_REQUIRED":
          where.paymentStatus = { in: ["PENDING_VERIFICATION", "VERIFYING"] };
          break;
        case "CASH_PENDING":
          where.cashStatus = "PENDING_CASH_APPROVAL";
          break;
        case "FAILED":
          where.paymentStatus = "FAILED";
          break;
        default:
          where.paymentStatus = statusFilter;
          break;
      }
    }

    if (query) {
      where.OR = [
        { referenceId: { contains: query, mode: "insensitive" } },
        { userName: { contains: query, mode: "insensitive" } },
        { userEmail: { contains: query, mode: "insensitive" } },
        { internId: { contains: query, mode: "insensitive" } },
        { domain: { contains: query, mode: "insensitive" } },
        { utrNumber: { contains: query, mode: "insensitive" } },
      ];
    }

    const [total, payments, allInternsCount, allPaymentsSummary] = await Promise.all([
      db.paymentRequest.count({ where }),
      db.paymentRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              role: true,
              department: true,
              internServicePaymentPaid: true,
              profileMediaUrl: true,
              employmentProfile: {
                select: {
                  employeeId: true,
                  department: true,
                  designation: true,
                },
              },
            },
          },
          attempts: {
            orderBy: { createdAt: "desc" },
            take: 2,
          },
        },
      }),
      db.user.count({ where: { role: "INTERN" } }),
      db.paymentRequest.findMany({
        select: {
          id: true,
          userId: true,
          paymentStatus: true,
          paymentMethod: true,
          cashStatus: true,
          fixedAmount: true,
          utrNumber: true,
        },
      }),
    ]);

    // Live Metrics Calculation
    let paidCount = 0;
    let pendingPaymentCount = 0;
    let upiVerifyingCount = 0;
    let cashPendingCount = 0;
    let failedCount = 0;

    for (const p of allPaymentsSummary) {
      const isPaid = p.paymentStatus === "APPROVED" || p.paymentStatus === "SUCCESS" || p.cashStatus === "CASH_RECEIVED";
      if (isPaid) paidCount++;
      else if (p.cashStatus === "PENDING_CASH_APPROVAL") cashPendingCount++;
      else if (p.paymentStatus === "PENDING_VERIFICATION" || p.paymentStatus === "VERIFYING") upiVerifyingCount++;
      else if (p.paymentStatus === "FAILED") failedCount++;
      else pendingPaymentCount++;
    }

    const totalInterns = allInternsCount > 0 ? allInternsCount : allPaymentsSummary.length;
    const notPaidCount = Math.max(0, totalInterns - paidCount);
    const fixedAmt = 450;
    const totalExpectedAmount = totalInterns * fixedAmt;
    const totalCollectedAmount = paidCount * fixedAmt;
    const pendingAmount = totalExpectedAmount - totalCollectedAmount;

    // Mask sensitive UTR for non-founders (CEO, CTO, HR)
    const sanitizedPayments = payments.map((p) => {
      let utr = p.utrNumber;
      if (!isFullAdmin && utr) {
        utr = utr.length > 4 ? `********${utr.slice(-4)}` : "********";
      }

      const isItemPaid = p.paymentStatus === "APPROVED" || p.paymentStatus === "SUCCESS" || p.cashStatus === "CASH_RECEIVED";

      return {
        id: p.id,
        referenceId: p.referenceId,
        userId: p.userId,
        userName: p.userName || p.user?.fullName || p.user?.username || "Intern",
        userEmail: p.userEmail || p.user?.email,
        userPfp: p.user?.profileMediaUrl || null,
        internId: p.internId || p.user?.employmentProfile?.employeeId || "CXA-INT-2026",
        domain: p.domain || p.user?.department || "Engineering",
        amount: Number(p.fixedAmount || 450),
        currency: p.currency,
        status: isItemPaid ? "PAID" : (p.cashStatus === "PENDING_CASH_APPROVAL" ? "CASH_PENDING" : p.paymentStatus),
        paymentMethod: p.paymentMethod || p.selectedUpiMethod || "UPI",
        cashStatus: p.cashStatus || "NONE",
        utrNumber: utr,
        proofImageUrl: p.proofImageUrl,
        paymentDate: p.paymentDate,
        verifiedAt: p.verifiedAt,
        verifiedByName: p.verifiedByName,
        rejectionReason: p.rejectionReason,
        createdAt: p.createdAt,
        latestAttempt: p.attempts?.[0] ? {
          id: p.attempts[0].id,
          status: p.attempts[0].status,
          detectedApp: p.attempts[0].detectedApp,
          detectedAmount: p.attempts[0].detectedAmount ? Number(p.attempts[0].detectedAmount) : null,
          detectedUtr: isFullAdmin ? p.attempts[0].detectedUtr : "********",
          verificationReason: p.attempts[0].verificationReason,
          proofImageUrl: p.attempts[0].proofImageUrl,
        } : null,
      };
    });

    return NextResponse.json({
      ok: true,
      isManagement: true,
      canApprove: isFullAdmin,
      canApproveCash,
      userRole: effectiveRole,
      metrics: {
        totalInterns,
        paidCount,
        notPaidCount,
        pendingPaymentCount,
        upiVerifyingCount,
        cashPendingCount,
        failedCount,
        totalExpectedAmount,
        totalCollectedAmount,
        pendingAmount,
      },
      payments: sanitizedPayments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      payment: ownPaymentData,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/mobile/payments]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load payment data." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}