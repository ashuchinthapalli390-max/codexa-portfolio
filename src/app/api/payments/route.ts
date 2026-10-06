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
    const purpose = searchParams.get("purpose");
    const query = searchParams.get("q")?.trim();
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);

    const where: any = {};

    if (!canViewAll) {
      where.userId = user.id;
    } else if (searchParams.get("userId")) {
      where.userId = searchParams.get("userId");
    }

    if (status && status !== "ALL") {
      where.paymentStatus = status;
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
        { utrNumber: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
      ];
    }

    const [total, payments] = await Promise.all([
      db.paymentRequest.count({ where }),
      db.paymentRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
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
        },
      }),
    ]);

    return NextResponse.json({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      canManage: hasPermission(user, Permission.CREATE_PAYMENT_REQUEST),
      canVerify: hasPermission(user, Permission.VERIFY_PAYMENT),
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
