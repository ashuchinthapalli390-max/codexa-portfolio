import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const currentUser = auth.user;
  const canViewAll =
    hasPermission(currentUser, Permission.VIEW_PAYROLL) ||
    hasPermission(currentUser, Permission.VIEW_PAYMENTS);

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const yearParam = url.searchParams.get("year");
  const statusParam = url.searchParams.get("status");
  const userParam = url.searchParams.get("userId");

  try {
    const whereClause: any = {};

    // Enforce self-only view if user lacks admin payroll view permission
    if (!canViewAll) {
      whereClause.userId = currentUser.id;
    } else if (userParam) {
      whereClause.userId = userParam;
    }

    if (monthParam) {
      whereClause.month = parseInt(monthParam, 10);
    }
    if (yearParam) {
      whereClause.year = parseInt(yearParam, 10);
    }
    if (statusParam) {
      whereClause.status = statusParam.toUpperCase();
    }

    const records = await db.payrollRecord.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            orgRole: true,
            employmentProfile: {
              select: {
                employeeId: true,
                department: true,
                designation: true,
                employmentType: true,
                bankAccountMasked: true,
              },
            },
          },
        },
        payslips: {
          select: {
            id: true,
            slipNumber: true,
            issuedAt: true,
            status: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    });

    // Summary statistics for dashboard/management
    let summary = {
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      count: records.length,
    };

    records.forEach((r) => {
      summary.totalAmount += r.netAmount;
      if (r.status === "PAID") {
        summary.paidAmount += r.netAmount;
      } else {
        summary.pendingAmount += r.netAmount;
      }
    });

    return NextResponse.json(
      {
        success: true,
        summary,
        records,
        isSelfOnly: !canViewAll,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/payroll]", err);
    return NextResponse.json(
      { error: "Failed to retrieve payroll records." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.MANAGE_PAYROLL)) {
    return NextResponse.json(
      { error: "Forbidden. Insufficient permissions to create payroll entries." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      userId,
      period,
      month,
      year,
      basicAmount = 0,
      allowances = 0,
      bonus = 0,
      deductions = 0,
      dueDate,
      paymentMethod = "BANK_TRANSFER",
      notes,
    } = body;

    if (!userId || !month || !year) {
      return NextResponse.json(
        { error: "userId, month, and year are required." },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    const basicNum = parseFloat(basicAmount) || 0;
    const allowNum = parseFloat(allowances) || 0;
    const bonusNum = parseFloat(bonus) || 0;
    const dedNum = parseFloat(deductions) || 0;
    const netAmount = Math.max(0, basicNum + allowNum + bonusNum - dedNum);

    const record = await db.payrollRecord.create({
      data: {
        userId,
        period: period || `${month}/${year}`,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        basicAmount: basicNum,
        allowances: allowNum,
        bonus: bonusNum,
        deductions: dedNum,
        netAmount,
        status: "SCHEDULED",
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentMethod,
        notes: notes ? notes.trim() : null,
      },
    });

    const targetName = targetUser.fullName || targetUser.username;

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: record.id,
      action: "PAYROLL_CREATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) created payroll entry of ₹${netAmount} for ${targetName} (${record.period}).`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      record,
      message: `Payroll entry created for ${targetName}.`,
    });
  } catch (err: any) {
    console.error("[POST /api/payroll]", err);
    return NextResponse.json({ error: "Failed to create payroll entry." }, { status: 500 });
  }
}
