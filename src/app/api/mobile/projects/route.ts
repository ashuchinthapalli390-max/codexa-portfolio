import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") {
        return res.user;
      }
    }
  }

  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") {
    return cookieRes.user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    // Load projects where user is creator or collaborator
    const collabs = await db.projectCollaborator.findMany({
      where: { userId: user.id },
      select: { projectId: true, roleTitle: true },
    });

    const projectIds = collabs.map((c) => c.projectId);

    const projects = await db.project.findMany({
      where: {
        OR: [
          { id: { in: projectIds } },
          { createdBy: user.id },
        ],
      },
      include: {
        creator: {
          select: { id: true, fullName: true, username: true, role: true },
        },
        collaborators: {
          include: {
            user: { select: { id: true, fullName: true, username: true, role: true } },
          },
        },
        links: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      projects: projects.map((p) => {
        const myCollab = collabs.find((c) => c.projectId === p.id);
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          shortDesc: p.shortDesc,
          overview: p.overview,
          problem: p.problem,
          solution: p.solution,
          features: p.features,
          techStack: p.techStack,
          category: p.category,
          status: p.status,
          thumbnailUrl: p.thumbnailUrl,
          myRole: myCollab?.roleTitle || (p.createdBy === user.id ? "Lead / Creator" : "Contributor"),
          progressPercentage: p.status === "Live" ? 100 : 75,
          collaborators: p.collaborators.map((c) => ({
            id: c.user.id,
            name: c.user.fullName || c.user.username,
            roleTitle: c.roleTitle,
          })),
          updatedAt: p.updatedAt,
        };
      }),
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/projects]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load projects." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, completedWork, currentWork, blockers, progress } = body;

    if (!projectId) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_PROJECT_ID", message: "Project ID is required." } }, { status: 400 });
    }

    // Log update as post or audit
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ ok: false, error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } }, { status: 404 });
    }

    // Create an internal progress update post
    const post = await db.post.create({
      data: {
        authorId: user.id,
        projectId,
        content: `[Project Update - ${project.title}]\nCompleted: ${completedWork || "N/A"}\nWorking On: ${currentWork || "N/A"}\nBlockers: ${blockers || "None"}\nProgress: ${progress || "75"}%`,
        isAnnouncement: false,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Progress update submitted successfully.",
      post,
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/projects]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit project update." } }, { status: 500 });
  }
}
