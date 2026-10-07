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

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
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

    const { username } = params;
    if (!username) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Username parameter missing." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: "insensitive" } },
          { id: username },
        ],
        isActive: true,
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
            joiningDate: true,
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

    const safeProfile = {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.profile?.displayName || user.username,
      role: user.role,
      orgRole: user.orgRole,
      department: user.department || user.employmentProfile?.department || "General",
      designation: user.employmentProfile?.designation || user.profile?.primaryRole || user.role,
      employeeId: user.employmentProfile?.employeeId || null,
      profileMediaUrl: user.profileMediaUrl || user.profile?.mediaUrl || null,
      headline: user.profile?.headline || null,
      bio: user.profile?.bio || user.profile?.publicBio || null,
      mentorName: user.employmentProfile?.mentorName || null,
      internshipDuration: user.employmentProfile?.internshipDuration || null,
      joiningDate: user.employmentProfile?.joiningDate?.toISOString() || null,
      skills: user.skills.map((s) => s.skillName),
      links: user.links,
      githubUrl: user.profile?.githubUrl || null,
      linkedinUrl: user.profile?.linkedinUrl || null,
      portfolioUrl: user.profile?.portfolioUrl || null,
      projects: combinedProjects,
      isSelf: user.id === caller.id,
    };

    return NextResponse.json({
      ok: true,
      profile: safeProfile,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/profile/:username error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Could not load profile." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
