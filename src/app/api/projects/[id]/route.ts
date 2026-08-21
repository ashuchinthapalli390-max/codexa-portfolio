/**
 * /api/projects/[id]
 * GET: Get single project by ID or Slug
 * PATCH: Edit project. (Creators edit own; Owner can approve as Main Project or feature)
 * DELETE: Delete project (Creator or Owner)
 */
import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await dataStore.getProjectBySlug(params.id);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, project });
  } catch (err: any) {
    console.error("[GET /api/projects/[id]]", err);
    return NextResponse.json({ error: "Failed to load project." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await dataStore.getProjectBySlug(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const isOwner = user.role === "OWNER";
    const isCreator = existing.createdBy === user.id;

    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: "Forbidden. You can only edit your own projects." }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      shortDesc,
      overview,
      problem,
      solution,
      features,
      techStack,
      category,
      status,
      thumbnailUrl,
      screenshots,
      repoUrl,
      liveUrl,
      isDraft,
      isPublic,
      isFeatured,
      isMainProject,
      displayOrder,
      collaboratorIds,
    } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (shortDesc !== undefined) updates.shortDesc = shortDesc.trim();
    if (overview !== undefined) updates.overview = overview;
    if (problem !== undefined) updates.problem = problem;
    if (solution !== undefined) updates.solution = solution;
    if (features !== undefined) updates.features = features;
    if (techStack !== undefined) updates.techStack = techStack;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
    if (screenshots !== undefined) updates.screenshots = screenshots;
    if (repoUrl !== undefined) updates.repoUrl = repoUrl;
    if (liveUrl !== undefined) updates.liveUrl = liveUrl;
    if (isDraft !== undefined) updates.isDraft = isDraft;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (body.isHomepageVisible !== undefined) updates.isHomepageVisible = Boolean(body.isHomepageVisible);
    if (body.showInTeamProjects !== undefined) updates.showInTeamProjects = Boolean(body.showInTeamProjects);
    if (collaboratorIds !== undefined) updates.collaboratorIds = collaboratorIds;

    // Owner-only fields
    if (isOwner) {
      if (isFeatured !== undefined) updates.isFeatured = isFeatured;
      if (isMainProject !== undefined) updates.isMainProject = isMainProject;
      if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    }

    const updated = await dataStore.updateProject(existing.id, updates);

    // Audit log if Main Project status changed
    if (isOwner && isMainProject !== undefined && isMainProject !== existing.isMainProject) {
      await dataStore.logAudit({
        actorId: user.id,
        actorName: user.displayName,
        targetId: existing.id,
        action: isMainProject ? "MAIN_PROJECT_APPROVED" : "MAIN_PROJECT_REMOVED",
        details: `Owner ${isMainProject ? "approved" : "removed"} '${existing.title}' as official Main Project.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    console.error("[PATCH /api/projects/[id]]", err);
    return NextResponse.json({ error: "Failed to update project." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await dataStore.getProjectBySlug(id);
    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const isOwner = user.role === "OWNER";
    const isCreator = existing.createdBy === user.id;

    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: "Forbidden. You can only delete your own projects." }, { status: 403 });
    }

    await dataStore.deleteProject(existing.id);

    await dataStore.logAudit({
      actorId: user.id,
      actorName: user.displayName,
      targetId: existing.id,
      action: "PROJECT_DELETED",
      details: `${user.displayName} deleted project '${existing.title}'.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Project deleted successfully." });
  } catch (err: any) {
    console.error("[DELETE /api/projects/[id]]", err);
    return NextResponse.json({ error: "Failed to delete project." }, { status: 500 });
  }
}
