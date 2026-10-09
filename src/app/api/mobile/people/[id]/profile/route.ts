import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { formatProfileMediaUrl } from "@/lib/profile-media";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = generateRequestId();

  try {
    const caller = await resolveRequestUser(req);
    if (!caller) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const rawIdentifier = params.id?.trim();
    if (!rawIdentifier) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "User identifier missing." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanIdentifier = rawIdentifier.replace(/^@/, "");

    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: cleanIdentifier },
          { username: { equals: cleanIdentifier, mode: "insensitive" } },
          { email: { equals: cleanIdentifier, mode: "insensitive" } },
          { employmentProfile: { employeeId: { equals: cleanIdentifier, mode: "insensitive" } } },
        ],
      },
      include: {
        profile: true,
        employmentProfile: {
          select: {
            employeeId: true,
            department: true,
            designation: true,
            mentorName: true,
            internshipDuration: true,
            internshipDomain: true,
            internshipDurationMonths: true,
            internshipStartDate: true,
            internshipEndDate: true,
            college: true,
            collegeLocation: true,
            yearOfStudy: true,
            academicBranch: true,
            referenceNumber: true,
            joiningDate: true,
            endDate: true,
            status: true,
          },
        },
        skills: {
          select: { skillName: true },
        },
        links: {
          where: { isVisible: true },
          select: { label: true, url: true, icon: true },
        },
        projectsCreated: {
          take: 5,
          select: { id: true, title: true, slug: true, category: true, status: true },
        },
        projectCollabs: {
          take: 5,
          include: {
            project: {
              select: { id: true, title: true, slug: true, category: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "USER_NOT_FOUND", message: "Member profile not found." }, requestId },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const combinedProjects = [
      ...user.projectsCreated.map((p) => ({ ...p, role: "Lead / Creator" })),
      ...user.projectCollabs.map((c) => ({ ...c.project, role: c.roleTitle || "Collaborator" })),
    ];

    const emp = user.employmentProfile as any;
    const safeProfile = {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.profile?.displayName || user.username,
      role: user.role,
      orgRole: user.orgRole,
      department: emp?.internshipDomain || emp?.department || user.department || "General",
      designation: emp?.designation || user.profile?.primaryRole || user.role,
      employeeId: emp?.employeeId || null,
      internshipDomain: emp?.internshipDomain || emp?.department || null,
      internshipDuration: emp?.internshipDuration || (emp?.internshipDurationMonths ? `${emp.internshipDurationMonths} Months` : null),
      startDate: emp?.internshipStartDate?.toISOString() || emp?.joiningDate?.toISOString() || null,
      endDate: emp?.internshipEndDate?.toISOString() || emp?.endDate?.toISOString() || null,
      college: emp?.college || null,
      collegeLocation: emp?.collegeLocation || null,
      yearOfStudy: emp?.yearOfStudy || null,
      academicBranch: emp?.academicBranch || null,
      referenceNumber: emp?.referenceNumber || null,
      profileMediaUrl: formatProfileMediaUrl(user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl),
      headline: user.profile?.headline || null,
      bio: user.profile?.bio || user.profile?.publicBio || null,
      mentorName: emp?.mentorName || null,
      joiningDate: emp?.joiningDate?.toISOString() || null,
      status: emp?.status || (user.isActive ? "ACTIVE" : "INACTIVE"),
      skills: user.skills.map((s) => s.skillName),
      links: user.links,
      githubUrl: user.profile?.githubUrl || null,
      linkedinUrl: user.profile?.linkedinUrl || null,
      portfolioUrl: user.profile?.portfolioUrl || null,
      projects: combinedProjects,
      isSelf: user.id === caller.id,
    };

    return NextResponse.json(
      {
        ok: true,
        profile: safeProfile,
        requestId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error(`[GET /api/mobile/people/:id/profile error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Could not load profile." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
