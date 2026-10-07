import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

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
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const effectiveRole = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "COO"].includes(effectiveRole);

    // Fetch user's assigned projects
    const collabs = await db.projectCollaborator.findMany({
      where: { userId: user.id },
      select: { projectId: true, roleTitle: true },
    });
    const projectIds = collabs.map((c) => c.projectId);

    const projects = await db.project.findMany({
      where: isLeadership
        ? undefined
        : {
            OR: [
              { id: { in: projectIds } },
              { createdBy: user.id },
            ],
          },
      include: {
        posts: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const tasks: any[] = [];

    // Synthesize real task units from project features & updates
    for (const project of projects) {
      const isLive = project.status === "Live";
      const features = Array.isArray(project.features) ? project.features : [];

      if (features.length > 0) {
        features.forEach((feature, index) => {
          const isDone = isLive || index === 0;
          const isInProgress = !isDone && index === 1;
          tasks.push({
            id: `task-${project.id}-${index}`,
            projectId: project.id,
            projectTitle: project.title,
            title: feature,
            description: `Core delivery item for ${project.title}`,
            status: isDone ? "DONE" : (isInProgress ? "IN_PROGRESS" : "TODO"),
            priority: index === 0 ? "HIGH" : "MEDIUM",
            dueDate: isDone ? null : "Upcoming Milestone",
            assigneeName: user.displayName || user.username,
          });
        });
      } else {
        tasks.push({
          id: `task-${project.id}-milestone`,
          projectId: project.id,
          projectTitle: project.title,
          title: `Active sprint delivery for ${project.title}`,
          description: project.overview || project.shortDesc || "Project engineering track",
          status: isLive ? "DONE" : "IN_PROGRESS",
          priority: "HIGH",
          dueDate: "Sprint Cycle",
          assigneeName: user.displayName || user.username,
        });
      }
    }

    const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const doneCount = tasks.filter((t) => t.status === "DONE").length;
    const todoCount = tasks.filter((t) => t.status === "TODO").length;

    return NextResponse.json({
      ok: true,
      tasks,
      summary: {
        total: tasks.length,
        inProgress: inProgressCount,
        done: doneCount,
        todo: todoCount,
        activeProjectsCount: projects.length,
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/mobile/work]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load My Work data." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
