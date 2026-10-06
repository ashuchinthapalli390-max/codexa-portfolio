import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { Permission, hasPermission } from "@/lib/permissions";
import { generatePayslipNumber } from "@/lib/cxa-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const record: any = await db.payrollRecord.findUnique({
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

    let payslip = record.payslips[0];
    if (!payslip) {
      const slipNum = await generatePayslipNumber(record.month, record.year);
      payslip = await db.payslip.create({
        data: {
          payrollRecordId: id,
          userId: record.userId,
          slipNumber: slipNum,
          period: record.period,
          grossAmount: record.basicAmount + record.allowances + record.bonus,
          deductions: record.deductions,
          netAmount: record.netAmount,
          status: record.status === "PAID" ? "ISSUED" : "DRAFT",
        },
      });
    }

    const emp = record.user.employmentProfile;

    // Structured printable document payload
    const payslipData = {
      agency: {
        name: "CodeXa Agency",
        tagline: "Elite Engineering & Autonomous AI Agency",
        website: "https://codxa-agency.online",
        email: "contact@codxa-agency.online",
        address: "CodeXa Tech Hub, India",
      },
      slipNumber: payslip.slipNumber,
      issuedAt: payslip.issuedAt,
      payPeriod: record.period,
      employee: {
        name: record.user.fullName || record.user.username,
        username: record.user.username,
        email: record.user.email,
        employeeId: emp?.employeeId || "CXA-MEMBER",
        department: emp?.department || "Engineering",
        designation: emp?.designation || record.user.role,
        employmentType: emp?.employmentType || "CORE_TEAM",
        bankAccountMasked: emp?.bankAccountMasked || "XXXX XXXX 4832",
      },
      financials: {
        basicSalaryOrStipend: record.basicAmount,
        allowances: record.allowances,
        bonus: record.bonus,
        grossEarnings: record.basicAmount + record.allowances + record.bonus,
        deductions: record.deductions,
        netPay: record.netAmount,
      },
      disbursement: {
        status: record.status,
        paymentDate: record.paymentDate,
        paymentMethod: record.paymentMethod,
        transactionRef: record.transactionRef,
        verifiedBy: record.verifiedBy,
        approvedBy: record.approvedBy,
      },
    };

    return NextResponse.json({ success: true, payslip: payslipData });
  } catch (err: any) {
    console.error("[GET /api/payroll/:id/payslip]", err);
    return NextResponse.json({ error: "Failed to generate payslip." }, { status: 500 });
  }
}
