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
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    // Role filtering
    if (roleFilter === "INTERNS") {
      where.role = "INTERN";
    } else if (roleFilter === "EMPLOYEES") {
      where.role = { in: ["EMPLOYEE", "CONTRACTOR"] };
    } else if (roleFilter === "MANAGEMENT") {
      where.role = { in: ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"] };
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
              mentorName: true,
              internshipDuration: true,
              joiningDate: true,
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
      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.profile?.displayName || u.username,
        role: u.role,
        orgRole: u.orgRole,
        department: u.department || u.employmentProfile?.department || "General",
        designation: u.employmentProfile?.designation || u.profile?.primaryRole || u.role,
        employeeId: u.employmentProfile?.employeeId || null,
        profileMediaUrl: u.profileMediaUrl || u.profile?.mediaUrl || null,
        headline: u.profile?.headline || null,
        bio: u.profile?.bio || null,
        skills: skillsList,
        isSelf: u.id === caller.id,
      };
    });

    return NextResponse.json({
      ok: true,
      people,
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
