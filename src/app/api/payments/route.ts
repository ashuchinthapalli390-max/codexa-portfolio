import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { generatePaymentReferenceId } from "@/lib/cxa-ids";
import { sendPaymentRequestedEmail } from "@/lib/email/notifications";
import { normalizeDomain, getDomainsByDuration } from "@/lib/internships/domains";

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

    // Duration filter (2, 3, 6, 9 months tracks)
    const duration = searchParams.get("duration");
    if (duration && duration !== "ALL") {
      const months = parseInt(duration, 10);
      if ([2, 3, 6, 9].includes(months)) {
        const matchingDomains = getDomainsByDuration(months as 2 | 3 | 6 | 9).map((d) => d.label);
        where.domain = { in: matchingDomains };
      }
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
      canViewAll ? db.user.count({ where: { OR: [{ role: "INTERN" }, { orgRole: "INTERN" }] } }) : Promise.resolve(0),
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
        } else if (
          p.paymentStatus === "PENDING_APPROVAL" ||
          p.paymentStatus === "PENDING_VERIFICATION" ||
          p.paymentStatus === "VERIFYING"
        ) {
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
      const totalExpectedAmount = allPaymentsSummary.reduce((sum, p) => sum + Number(p.fixedAmount || 450), 0);
      const totalCollectedAmount = allPaymentsSummary
        .filter((p) => p.paymentStatus === "APPROVED" || p.paymentStatus === "SUCCESS" || p.cashStatus === "CASH_RECEIVED")
        .reduce((sum, p) => sum + Number(p.fixedAmount || 450), 0);
      const pendingAmount = Math.max(0, totalExpectedAmount - totalCollectedAmount);

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
      if (paymentPurpose === "INTERNSHIP_FEE" && targetRole === "EMPLOYEE") {
        return NextResponse.json(
          { error: "Policy Restriction: Mandatory ₹450 Internship Fee applies only to Interns, not Employees." },
          { status: 400 }
        );
      }

      let targetUsers: any[] = [];

      if (Array.isArray(userIds) && userIds.length > 0) {
        targetUsers = await db.user.findMany({
          where: { id: { in: userIds }, isActive: true },
          include: { employmentProfile: true },
        });
      } else if (targetRole) {
        let roleWhere: any = {};
        if (targetRole === "LEARNING_INTERN") {
          roleWhere = {
            OR: [
              { employmentProfile: { workforceType: "LEARNING_INTERN" } },
              { role: "INTERN" },
            ],
            isActive: true,
          };
        } else if (targetRole === "INTERN") {
          roleWhere = {
            OR: [
              { role: "INTERN" },
              { orgRole: "INTERN" },
              { employmentProfile: { employmentType: "INTERN" } },
            ],
            isActive: true,
          };
        } else if (targetRole === "EMPLOYEE") {
          roleWhere = {
            OR: [
              { role: "EMPLOYEE" },
              { orgRole: "EMPLOYEE" },
              { employmentProfile: { workforceType: "EMPLOYEE" } },
            ],
            isActive: true,
          };
        } else {
          roleWhere = {
            OR: [{ role: targetRole }, { orgRole: targetRole }],
            isActive: true,
          };
        }

        targetUsers = await db.user.findMany({
          where: roleWhere,
          include: { employmentProfile: true },
        });

        if (domain && domain !== "ALL") {
          const canonical = normalizeDomain(domain);
          targetUsers = targetUsers.filter(
            (u) =>
              (u.employmentProfile?.internshipDomain || "").toLowerCase() === canonical.toLowerCase() ||
              (u.employmentProfile?.department || "").toLowerCase() === canonical.toLowerCase() ||
              (u.department || "").toLowerCase() === canonical.toLowerCase()
          );
        }
      }

      if (targetUsers.length === 0) {
        return NextResponse.json({ error: "No matching active users found for bulk payment request." }, { status: 400 });
      }

      // Check existing payments for duplicate prevention
      const existingPayments = await db.paymentRequest.findMany({
        where: {
          userId: { in: targetUsers.map((u) => u.id) },
          paymentPurpose,
        },
        select: {
          userId: true,
          paymentStatus: true,
          cashStatus: true,
          referenceId: true,
        },
      });

      const alreadyPaidUserIds = new Set(
        existingPayments
          .filter((p) => p.paymentStatus === "APPROVED" || p.paymentStatus === "SUCCESS" || p.cashStatus === "CASH_RECEIVED")
          .map((p) => p.userId)
      );

      const alreadyPendingUserIds = new Set(
        existingPayments
          .filter((p) => !alreadyPaidUserIds.has(p.userId) && (p.paymentStatus === "PENDING_PAYMENT" || p.paymentStatus === "PENDING_VERIFICATION" || p.cashStatus === "PENDING_CASH_APPROVAL"))
          .map((p) => p.userId)
      );

      const eligibleUsers = targetUsers.filter((u) => !alreadyPaidUserIds.has(u.id) && !alreadyPendingUserIds.has(u.id));

      // Dry run preview
      if (dryRun) {
        return NextResponse.json({
          dryRun: true,
          totalSubmitted: targetUsers.length,
          eligibleCount: eligibleUsers.length,
          alreadyPaidCount: alreadyPaidUserIds.size,
          alreadyPendingCount: alreadyPendingUserIds.size,
          skippedCount: targetUsers.length - eligibleUsers.length,
          amountPerUser: amount,
          totalExpectedAmount: eligibleUsers.length * amount,
          previewUsers: eligibleUsers.slice(0, 10).map((u) => ({
            id: u.id,
            name: u.fullName || u.username,
            email: u.email,
            role: u.role,
            workforceType: u.employmentProfile?.workforceType || (u.role === "INTERN" ? "INTERN" : "EMPLOYEE"),
            domain: normalizeDomain(u.employmentProfile?.internshipDomain || u.employmentProfile?.department || u.department),
          })),
          alreadyBilledUsers: targetUsers.filter((u) => alreadyPendingUserIds.has(u.id)).map((u) => ({
            id: u.id,
            name: u.fullName || u.username,
            email: u.email,
          })),
          paidUsers: targetUsers.filter((u) => alreadyPaidUserIds.has(u.id)).map((u) => ({
            id: u.id,
            name: u.fullName || u.username,
            email: u.email,
          })),
        });
      }

      // Execute bulk creation
      const createdPayments: any[] = [];
      const parsedDueDate = dueDate ? new Date(dueDate) : null;

      for (const targetUser of eligibleUsers) {
        const refId = await generatePaymentReferenceId();
        const canonicalInternDomain = normalizeDomain(
          targetUser.employmentProfile?.internshipDomain ||
          targetUser.employmentProfile?.department ||
          targetUser.department ||
          domain
        );
        const userWorkforce = targetUser.employmentProfile?.workforceType || (targetUser.role === "INTERN" ? "INTERN" : "EMPLOYEE");

        const created = await db.paymentRequest.create({
          data: {
            referenceId: refId,
            userId: targetUser.id,
            userName: targetUser.fullName || targetUser.username,
            userEmail: targetUser.email,
            userRole: targetUser.role,
            workforceType: userWorkforce,
            employeeId: targetUser.employmentProfile?.employeeId || null,
            internId: targetUser.role === "INTERN" ? targetUser.employmentProfile?.employeeId : null,
            domain: canonicalInternDomain,
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

      await db.auditLog.create({
        data: {
          actorId: user.id,
          actorName: user.displayName || user.username || "Admin",
          action: "PAYMENT_REQUEST_CREATED",
          targetId: "BULK",
          details: JSON.stringify({
            message: `Created bulk payment requests for ${createdPayments.length} users (Total: ₹${createdPayments.length * amount})`,
            createdCount: createdPayments.length,
            skippedCount: targetUsers.length - eligibleUsers.length,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        createdCount: createdPayments.length,
        skippedCount: targetUsers.length - eligibleUsers.length,
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
        workforceType: targetUser.employmentProfile?.workforceType || (targetUser.role === "INTERN" ? "INTERN" : "EMPLOYEE"),
        employeeId: targetUser.employmentProfile?.employeeId || null,
        internId: targetUser.role === "INTERN" ? targetUser.employmentProfile?.employeeId : null,
        domain: normalizeDomain(targetUser.employmentProfile?.internshipDomain || targetUser.employmentProfile?.department || targetUser.department || domain),
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

    await db.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.displayName || user.username || "Admin",
        action: "PAYMENT_REQUEST_CREATED",
        targetId: payment.id,
        details: JSON.stringify({
          message: `Created payment request ${refId} for ${targetUser.email} (₹${amount})`,
          referenceId: refId,
          recipientEmail: targetUser.email,
          amount,
        }),
      },
    });

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment request" }, { status: 500 });
  }
}
