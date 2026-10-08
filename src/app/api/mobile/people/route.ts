import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";

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
  const requestId = generateRequestId();

  try {
    const caller = await resolveRequestUser(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const roleFilter = searchParams.get("role")?.trim().toUpperCase() || "ALL";
    const deptFilter = searchParams.get("dept")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role filtering with null-safe and active status protection
    if (roleFilter === "INTERNS") {
      where.role = "INTERN";
      where.OR = [
        { isActive: true },
        { employmentProfile: { status: "ACTIVE" } },
      ];
    } else if (roleFilter === "EMPLOYEES") {
      where.role = { in: ["EMPLOYEE", "CONTRACTOR"] };
      where.isActive = true;
    } else if (roleFilter === "MANAGEMENT") {
      where.role = { in: ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"] };
      where.isActive = true;
    } else {
      where.isActive = true;
    }

    // Department filtering
    if (deptFilter && deptFilter !== "ALL") {
      where.OR = [
        { department: { contains: deptFilter, mode: "insensitive" } },
        { employmentProfile: { department: { contains: deptFilter, mode: "insensitive" } } },
      ];
    }

    // Keyword search (Name, username, Employee ID, Intern ID, designation, skills)
    if (query) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { department: { contains: query, mode: "insensitive" } },
            {
              employmentProfile: {
                OR: [
                  { employeeId: { contains: query, mode: "insensitive" } },
                  { designation: { contains: query, mode: "insensitive" } },
                  { department: { contains: query, mode: "insensitive" } },
                ],
              },
            },
            {
              profile: {
                OR: [
                  { displayName: { contains: query, mode: "insensitive" } },
                  { primaryRole: { contains: query, mode: "insensitive" } },
                  { headline: { contains: query, mode: "insensitive" } },
                  { bio: { contains: query, mode: "insensitive" } },
                ],
              },
            },
            {
              skills: {
                some: {
                  skillName: { contains: query, mode: "insensitive" },
                },
              },
            },
          ],
        },
      ];
    }

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { role: "asc" },
          { createdAt: "desc" },
        ],
        include: {
          profile: true,
          employmentProfile: {
            select: {
              employeeId: true,
              department: true,
              designation: true,
              internshipDomain: true,
              mentorName: true,
              internshipDuration: true,
              internshipDurationMonths: true,
              internshipStartDate: true,
              internshipEndDate: true,
              joiningDate: true,
              endDate: true,
              status: true,
              college: true,
              academicBranch: true,
            },
          },
          skills: {
            select: { skillName: true },
            take: 5,
          },
        },
      }),
    ]);

    const people = users.map((u) => {
      const skillsList = u.skills.map((s) => s.skillName);
      const emp = u.employmentProfile as any;
      const startDate = emp?.internshipStartDate || emp?.joiningDate;
      const endDate = emp?.internshipEndDate || emp?.endDate;
      let daysRemaining: number | null = null;
      if (endDate) {
        daysRemaining = Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      }

      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.profile?.displayName || u.username,
        role: u.role,
        orgRole: u.orgRole,
        department: emp?.internshipDomain || emp?.department || u.department || "General",
        designation: emp?.designation || u.profile?.primaryRole || u.role,
        employeeId: emp?.employeeId || null,
        profileMediaUrl: u.profileMediaUrl || u.profile?.mediaUrl || null,
        headline: u.profile?.headline || null,
        bio: u.profile?.bio || null,
        skills: skillsList,
        isSelf: u.id === caller.id,
        internship: emp ? {
          internId: emp.employeeId || null,
          domain: emp.internshipDomain || emp.department || "Technical Track",
          duration: emp.internshipDuration || (emp.internshipDurationMonths ? `${emp.internshipDurationMonths} Months` : "3 Months"),
          months: emp.internshipDurationMonths || 3,
          startDate: startDate ? new Date(startDate).toISOString().split("T")[0] : null,
          endDate: endDate ? new Date(endDate).toISOString().split("T")[0] : null,
          mentor: emp.mentorName || "Shaik Ashu (Founder)",
          status: emp.status || "ACTIVE",
          college: emp.college || null,
          academicBranch: emp.academicBranch || null,
          daysRemaining,
        } : null,
      };
    });

    return NextResponse.json({
      ok: true,
      people,
      totalCount: total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/people error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Unable to load directory." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
