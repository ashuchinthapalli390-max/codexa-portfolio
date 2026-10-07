import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { generatePaymentReferenceId } from "@/lib/cxa-ids";
import { dataStore } from "@/lib/data-store";
import { sendPaymentRequestedEmail } from "@/lib/email/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments
 * Lists payment requests.
 * - If admin with VIEW_ALL_PAYMENTS: can view all requests with search/status filters.
 * - If regular user: returns only their own payment requests.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const domain = searchParams.get("domain");
    const purpose = searchParams.get("purpose");
    const query = searchParams.get("q")?.trim();
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);
    const effectiveRole = getEffectiveRole(user);
    const isFullAdmin = effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER";

    const where: any = {};

    if (!canViewAll) {
      where.userId = user.id;
    } else if (searchParams.get("userId")) {
      where.userId = searchParams.get("userId");
    }

    // Status filter mapping
    if (status && status !== "ALL") {
      switch (status) {
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
          break;
        case "UPI_VERIFYING":
          where.paymentStatus = { in: ["PENDING_VERIFICATION", "VERIFYING"] };
          break;
        case "CASH_PENDING":
          where.cashStatus = "PENDING_CASH_APPROVAL";
          break;
        case "FAILED":
          where.paymentStatus = "FAILED";
          break;
        case "EXPIRED":
          where.paymentStatus = "EXPIRED";
          break;
        default:
          where.paymentStatus = status;
          break;
      }
    }

    // Method filter mapping
    if (method && method !== "ALL") {
      if (method === "NOT_SELECTED") {
        where.paymentMethod = null;
      } else if (method === "GOOGLE_PAY" || method === "GPAY") {
        where.paymentMethod = { in: ["GOOGLE_PAY", "GPAY"] };
      } else {
        where.paymentMethod = method;
      }
    }

    // Domain filter
    if (domain && domain !== "ALL") {
      where.domain = { contains: domain, mode: "insensitive" };
    }

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
        { domain: { contains: query, mode: "insensitive" } },
        { utrNumber: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
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
              employmentProfile: {
                select: {
                  employeeId: true,
                  designation: true,
                  department: true,
                  joiningDate: true,
                  endDate: true,
                },
              },
            },
          },
          paymentAccount: {
            select: {
              name: true,
              upiId: true,
              payeeName: true,
            },
          },
          submissions: {
            select: {
              id: true,
              submissionNumber: true,
              status: true,
              submittedAt: true,
              utrNumber: true,
            },
            orderBy: { submissionNumber: "desc" },
          },
          attempts: {
            select: {
              id: true,
              status: true,
              selectedMethod: true,
              utrNumber: true,
              detectedUtr: true,
              detectedApp: true,
              startedAt: true,
              expiresAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 2,
          },
        },
      }),
      // Count total interns in database
      canViewAll ? db.user.count({ where: { role: "INTERN" } }) : Promise.resolve(0),
      // Summary data for live metrics
      canViewAll
        ? db.paymentRequest.findMany({
            select: {
              id: true,
              userId: true,
              paymentStatus: true,
              paymentMethod: true,
              cashStatus: true,
              fixedAmount: true,
              utrNumber: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Live Metrics Calculation
    let metrics: any = null;
    if (canViewAll) {
      let paidCount = 0;
      let pendingPaymentCount = 0;
      let upiVerifyingCount = 0;
      let cashPendingCount = 0;
      let failedCount = 0;
      let expiredCount = 0;

      const byMethod: Record<string, number> = {
        PHONEPE: 0,
        GOOGLE_PAY: 0,
        PAYTM: 0,
        OTHER_UPI: 0,
        CASH: 0,
        NOT_SELECTED: 0,
      };

      for (const p of allPaymentsSummary) {
        const isPaid =
          p.paymentStatus === "APPROVED" ||
          p.paymentStatus === "SUCCESS" ||
          p.cashStatus === "CASH_RECEIVED";

        if (isPaid) {
          paidCount += 1;
        } else if (p.cashStatus === "PENDING_CASH_APPROVAL") {
          cashPendingCount += 1;
        } else if (p.paymentStatus === "PENDING_VERIFICATION" || p.paymentStatus === "VERIFYING") {
          upiVerifyingCount += 1;
        } else if (p.paymentStatus === "FAILED") {
          failedCount += 1;
        } else if (p.paymentStatus === "EXPIRED") {
          expiredCount += 1;
        } else {
          pendingPaymentCount += 1;
        }

        // Method analytics
        if (p.paymentMethod === "PHONEPE") byMethod.PHONEPE += 1;
        else if (p.paymentMethod === "GOOGLE_PAY" || p.paymentMethod === "GPAY") byMethod.GOOGLE_PAY += 1;
        else if (p.paymentMethod === "PAYTM") byMethod.PAYTM += 1;
        else if (p.paymentMethod === "OTHER_UPI") byMethod.OTHER_UPI += 1;
        else if (p.paymentMethod === "CASH") byMethod.CASH += 1;
        else byMethod.NOT_SELECTED += 1;
      }

      const totalInterns = allInternsCount > 0 ? allInternsCount : allPaymentsSummary.length;
      const notPaidCount = Math.max(0, totalInterns - paidCount);
      const fixedAmt = 450;
      const totalExpectedAmount = totalInterns * fixedAmt;
      const totalCollectedAmount = paidCount * fixedAmt;
      const pendingAmount = totalExpectedAmount - totalCollectedAmount;

      metrics = {
        totalInterns,
        paidCount,
        notPaidCount,
        pendingPaymentCount,
        upiVerifyingCount,
        cashPendingCount,
        successfulCount: paidCount,
        failedCount,
        expiredCount,
        totalExpectedAmount,
        totalCollectedAmount,
        pendingAmount,
        byMethod,
      };
    }

    // Sanitize UTR for CEO/CTO/HR: mask sensitive digits
    const sanitizedPayments = payments.map((p) => {
      let utr = p.utrNumber;
      if (!isFullAdmin && utr) {
        utr = utr.length > 4 ? `********${utr.slice(-4)}` : "********";
      }

      return {
        ...p,
        utrNumber: utr,
      };
    });

    return NextResponse.json({
      payments: sanitizedPayments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      metrics,
      serverTime: new Date().toISOString(),
      canManage: hasPermission(user, Permission.CREATE_PAYMENT_REQUEST),
      canVerify: hasPermission(user, Permission.VERIFY_PAYMENT),
      canApproveCash: isFullAdmin,
      canManageSettings: isFullAdmin,
      userRole: effectiveRole,
    });
  } catch (error: any) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ error: error.message || "Failed to load payments" }, { status: 500 });
  }
}

/**
 * POST /api/payments
 * Creates a single or bulk payment request.
 * Requires CREATE_PAYMENT_REQUEST permission.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.CREATE_PAYMENT_REQUEST)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create payment requests" }, { status: 403 });
    }

    const body = await req.json();
    const {
      isBulk,
      userId,
      userIds,
      targetRole,
      domain,
      paymentPurpose = "INTERNSHIP_FEE",
      title = "Internship Service Fee",
      description,
      lineItems,
      fixedAmount,
      dueDate,
      paymentAccountId,
      dryRun,
    } = body;

    const amount = parseFloat(fixedAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "A valid positive fixed amount is required." }, { status: 400 });
    }

    // Default payment account if not provided
    let accountId = paymentAccountId;
    if (!accountId) {
      const defAcc = await db.paymentAccount.findFirst({ where: { isDefault: true } });
      accountId = defAcc?.id || null;
    }

    // ─── BULK CREATION ────────────────────────────────────────────────────────
    if (isBulk) {
      let targetUsers: any[] = [];

      if (Array.isArray(userIds) && userIds.length > 0) {
        targetUsers = await db.user.findMany({
          where: { id: { in: userIds }, isActive: true },
          include: { employmentProfile: true },
        });
      } else if (targetRole) {
        const roleWhere: any = {
          OR: [{ role: targetRole }, { orgRole: targetRole }],
          isActive: true,
        };
        targetUsers = await db.user.findMany({
          where: roleWhere,
          include: { employmentProfile: true },
        });

        if (domain && domain !== "ALL") {
          targetUsers = targetUsers.filter(
            (u) =>
              (u.employmentProfile?.department || "").toLowerCase() === domain.toLowerCase() ||
              (u.department || "").toLowerCase() === domain.toLowerCase()
          );
        }
      }

      if (targetUsers.length === 0) {
        return NextResponse.json({ error: "No matching active users found for bulk payment request." }, { status: 400 });
      }

      // Check duplicates (users who already have this pending payment purpose)
      const existingPayments = await db.paymentRequest.findMany({
        where: {
          userId: { in: targetUsers.map((u) => u.id) },
          paymentPurpose,
          paymentStatus: { in: ["PENDING_PAYMENT", "PENDING_VERIFICATION", "APPROVED"] },
        },
        select: { userId: true },
      });
      const existingUserIds = new Set(existingPayments.map((p) => p.userId));

      const eligibleUsers = targetUsers.filter((u) => !existingUserIds.has(u.id));
      const skippedCount = targetUsers.length - eligibleUsers.length;

      // Dry run preview
      if (dryRun) {
        return NextResponse.json({
          dryRun: true,
          totalSubmitted: targetUsers.length,
          eligibleCount: eligibleUsers.length,
          skippedCount,
          amountPerUser: amount,
          totalExpectedAmount: eligibleUsers.length * amount,
          previewUsers: eligibleUsers.slice(0, 10).map((u) => ({
            id: u.id,
            name: u.fullName || u.username,
            email: u.email,
            role: u.role,
            domain: u.employmentProfile?.department || u.department,
          })),
        });
      }

      // Execute bulk creation
      const createdPayments: any[] = [];
      const parsedDueDate = dueDate ? new Date(dueDate) : null;

      for (const targetUser of eligibleUsers) {
        const refId = await generatePaymentReferenceId();
        const created = await db.paymentRequest.create({
          data: {
            referenceId: refId,
            userId: targetUser.id,
            userName: targetUser.fullName || targetUser.username,
            userEmail: targetUser.email,
            userRole: targetUser.role,
            employeeId: targetUser.employmentProfile?.employeeId || null,
            internId: targetUser.role === "INTERN" ? targetUser.employmentProfile?.employeeId : null,
            domain: targetUser.employmentProfile?.department || targetUser.department || domain || null,
            paymentPurpose,
            title,
            description: description || null,
            lineItems: lineItems || null,
            fixedAmount: amount,
            currency: "INR",
            paymentStatus: "PENDING_PAYMENT",
            paymentAccountId: accountId,
            dueDate: parsedDueDate,
            createdById: user.id,
            createdByName: user.displayName || user.username || "Admin",
          },
        });
        createdPayments.push(created);

        // Async notify user via email
        sendPaymentRequestedEmail({
          referenceId: refId,
          recipientName: targetUser.fullName || targetUser.username,
          recipientEmail: targetUser.email,
          title,
          amount,
          dueDate: parsedDueDate ? parsedDueDate.toLocaleDateString() : undefined,
        }).catch(() => {});
      }

      await dataStore.logAudit(
        user.id,
        "PAYMENT_REQUEST_CREATED",
        `Created bulk payment requests for ${createdPayments.length} users (Total: ₹${createdPayments.length * amount})`
      );

      return NextResponse.json({
        success: true,
        createdCount: createdPayments.length,
        skippedCount,
        totalAmount: createdPayments.length * amount,
        payments: createdPayments,
      });
    }

    // ─── SINGLE CREATION ──────────────────────────────────────────────────────
    if (!userId) {
      return NextResponse.json({ error: "Target userId is required for a single payment request." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: { employmentProfile: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    const refId = await generatePaymentReferenceId();
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    const payment = await db.paymentRequest.create({
      data: {
        referenceId: refId,
        userId: targetUser.id,
        userName: targetUser.fullName || targetUser.username,
        userEmail: targetUser.email,
        userRole: targetUser.role,
        employeeId: targetUser.employmentProfile?.employeeId || null,
        internId: targetUser.role === "INTERN" ? targetUser.employmentProfile?.employeeId : null,
        domain: targetUser.employmentProfile?.department || targetUser.department || domain || null,
        paymentPurpose,
        title,
        description: description || null,
        lineItems: lineItems || null,
        fixedAmount: amount,
        currency: "INR",
        paymentStatus: "PENDING_PAYMENT",
        paymentAccountId: accountId,
        dueDate: parsedDueDate,
        createdById: user.id,
        createdByName: user.displayName || user.username || "Admin",
      },
      include: {
        paymentAccount: true,
      },
    });

    // Notify user
    sendPaymentRequestedEmail({
      referenceId: refId,
      recipientName: targetUser.fullName || targetUser.username,
      recipientEmail: targetUser.email,
      title,
      amount,
      dueDate: parsedDueDate ? parsedDueDate.toLocaleDateString() : undefined,
    }).catch(() => {});

    await dataStore.logAudit(
      user.id,
      "PAYMENT_REQUEST_CREATED",
      `Created payment request ${refId} for ${targetUser.email} (₹${amount})`
    );

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment request" }, { status: 500 });
  }
}
