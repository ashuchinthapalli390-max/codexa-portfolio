import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  requirePermission,
  hasPermission,
  getEffectiveRole,
  isPermanentFounder,
} from "@/lib/permissions";
import { generateCodeXaId } from "@/lib/cxa-ids";

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
  const canViewEmployees = hasPermission(currentUser, Permission.VIEW_EMPLOYEES);
  const canViewInterns = hasPermission(currentUser, Permission.VIEW_INTERNS);
  const canViewUsers = hasPermission(currentUser, Permission.VIEW_USERS);

  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type"); // "EMPLOYEE" | "INTERN"
  const statusFilter = url.searchParams.get("status");
  const departmentFilter = url.searchParams.get("department");
  const searchQuery = url.searchParams.get("search")?.toLowerCase().trim();

  // If user has no staff view permission, return only their own profile
  if (!canViewEmployees && !canViewInterns && !canViewUsers) {
    const ownProfile = await db.employmentProfile.findUnique({
      where: { userId: currentUser.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            orgRole: true,
            isActive: true,
            internServicePaymentPaid: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        profiles: ownProfile ? [ownProfile] : [],
        isSelfOnly: true,
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  const domainFilter = url.searchParams.get("domain") || url.searchParams.get("internshipDomain");
  const durationFilter = url.searchParams.get("duration");

  try {
    const whereClause: any = {};

    if (statusFilter) {
      whereClause.status = statusFilter.toUpperCase();
    }

    if (departmentFilter) {
      whereClause.department = {
        equals: departmentFilter,
        mode: "insensitive",
      };
    }

    if (domainFilter) {
      whereClause.OR = [
        { department: { equals: domainFilter, mode: "insensitive" } },
        { internshipDomain: { equals: domainFilter, mode: "insensitive" } },
      ];
    }

    if (durationFilter) {
      whereClause.internshipDuration = {
        contains: durationFilter,
        mode: "insensitive",
      };
    }

    if (typeFilter) {
      if (typeFilter.toUpperCase() === "INTERN") {
        whereClause.employmentType = "INTERN";
      } else {
        whereClause.employmentType = { not: "INTERN" };
      }
    }

    if (searchQuery) {
      const searchConditions = [
        { employeeId: { contains: searchQuery, mode: "insensitive" } },
        { designation: { contains: searchQuery, mode: "insensitive" } },
        { department: { contains: searchQuery, mode: "insensitive" } },
        { internshipDomain: { contains: searchQuery, mode: "insensitive" } },
        { college: { contains: searchQuery, mode: "insensitive" } },
        { referenceNumber: { contains: searchQuery, mode: "insensitive" } },
        {
          user: {
            OR: [
              { fullName: { contains: searchQuery, mode: "insensitive" } },
              { username: { contains: searchQuery, mode: "insensitive" } },
              { email: { contains: searchQuery, mode: "insensitive" } },
            ],
          },
        },
      ];

      if (whereClause.OR) {
        whereClause.AND = [{ OR: whereClause.OR }, { OR: searchConditions }];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    const profiles = await db.employmentProfile.findMany({
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
            isActive: true,
            internServicePaymentPaid: true,
          },
        },
      },
      orderBy: { joiningDate: "desc" },
    });

    return NextResponse.json(
      {
        success: true,
        count: profiles.length,
        profiles,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/employment]", err);
    return NextResponse.json(
      { error: "Failed to retrieve employment profiles." },
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
  const canManageEmp = hasPermission(currentUser, Permission.MANAGE_EMPLOYEES);
  const canManageInt = hasPermission(currentUser, Permission.MANAGE_INTERNS);

  if (!canManageEmp && !canManageInt) {
    return NextResponse.json(
      { error: "Forbidden. Insufficient permissions to manage employment profiles." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      userId,
      employmentType,
      department,
      designation,
      reportingTo,
      joiningDate,
      endDate,
      status,
      salaryCycle,
      basicSalary,
      allowance,
      stipend,
      bonus,
      deductions,
      mentorName,
      internshipDuration,
      bankAccountMasked,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "Target userId is required." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isIntern = (targetUser.role === "INTERN" || targetUser.orgRole === "INTERN" || employmentType === "INTERN");

    // Check if employment profile exists
    let profile = await db.employmentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const generatedId = await generateCodeXaId(isIntern ? "INTERN" : "EMPLOYEE");
      profile = await db.employmentProfile.create({
        data: {
          userId,
          employeeId: generatedId,
          employmentType: employmentType || (isIntern ? "INTERN" : "FULL_TIME"),
          department: department?.trim() || "Engineering",
          designation: designation?.trim() || (isIntern ? "Engineering Intern" : "Core Member"),
          reportingTo: reportingTo?.trim() || null,
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          status: status || "ACTIVE",
          salaryCycle: salaryCycle || (isIntern ? "STIPEND_MONTHLY" : "MONTHLY"),
          basicSalary: basicSalary !== undefined ? parseFloat(basicSalary) : null,
          allowance: allowance !== undefined ? parseFloat(allowance) : null,
          stipend: stipend !== undefined ? parseFloat(stipend) : null,
          bonus: bonus !== undefined ? parseFloat(bonus) : null,
          deductions: deductions !== undefined ? parseFloat(deductions) : null,
          mentorName: mentorName?.trim() || null,
          internshipDuration: internshipDuration?.trim() || null,
          bankAccountMasked: bankAccountMasked ? bankAccountMasked.trim() : null,
        },
      });
    } else {
      profile = await db.employmentProfile.update({
        where: { userId },
        data: {
          ...(employmentType && { employmentType }),
          ...(department && { department: department.trim() }),
          ...(designation && { designation: designation.trim() }),
          ...(reportingTo !== undefined && { reportingTo: reportingTo ? reportingTo.trim() : null }),
          ...(joiningDate && { joiningDate: new Date(joiningDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(status && { status }),
          ...(salaryCycle && { salaryCycle }),
          ...(basicSalary !== undefined && { basicSalary: basicSalary !== null ? parseFloat(basicSalary) : null }),
          ...(allowance !== undefined && { allowance: allowance !== null ? parseFloat(allowance) : null }),
          ...(stipend !== undefined && { stipend: stipend !== null ? parseFloat(stipend) : null }),
          ...(bonus !== undefined && { bonus: bonus !== null ? parseFloat(bonus) : null }),
          ...(deductions !== undefined && { deductions: deductions !== null ? parseFloat(deductions) : null }),
          ...(mentorName !== undefined && { mentorName: mentorName ? mentorName.trim() : null }),
          ...(internshipDuration !== undefined && { internshipDuration: internshipDuration ? internshipDuration.trim() : null }),
          ...(bankAccountMasked !== undefined && { bankAccountMasked: bankAccountMasked ? bankAccountMasked.trim() : null }),
        },
      });
    }

    const targetDisplayName = targetUser.fullName || targetUser.username;

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: userId,
      action: "EMPLOYMENT_UPDATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) updated employment profile for ${targetDisplayName} (${profile.employeeId}).`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      profile,
      message: `Employment profile saved for ${targetDisplayName}.`,
    });
  } catch (err: any) {
    console.error("[POST /api/employment]", err);
    return NextResponse.json({ error: "Failed to save employment profile." }, { status: 500 });
  }
}
