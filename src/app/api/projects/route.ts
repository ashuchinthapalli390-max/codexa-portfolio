import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mainOnly = searchParams.get("main") === "true";
  const publicOnly = searchParams.get("public") === "true";
  const featuredOnly = searchParams.get("featured") === "true";
  const category = searchParams.get("category") || undefined;
  const developerId = searchParams.get("developerId") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const filter: any = {};
    if (mainOnly) filter.isMainProject = true;
    if (publicOnly) filter.isPublic = true;
    if (featuredOnly) filter.isFeatured = true;
    if (category) filter.category = category;
    if (developerId) filter.developerId = developerId;
    if (search) filter.search = search;

    const projects = await dataStore.getProjects(filter);
    return NextResponse.json({ success: true, projects }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json({ error: "Failed to load projects." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Session required to submit projects." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const user = auth.user;

  try {
    const body = await req.json();
    const {
      title,
      slug,
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
      collaboratorIds,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Project Title is required." }, { status: 400 });
    }
    if (!shortDesc || !shortDesc.trim()) {
      return NextResponse.json({ error: "Short Description is required." }, { status: 400 });
    }

    const newProject = await dataStore.createProject({
      title: title.trim(),
      slug: slug?.trim(),
      shortDesc: shortDesc.trim(),
      overview: overview || shortDesc,
      problem: problem || "",
      solution: solution || "",
      features: Array.isArray(features) ? features : ["Modern UI", "Full-Stack System"],
      techStack: Array.isArray(techStack) ? techStack : ["Next.js", "React"],
      category: category || "Web",
      status: status || "Live",
      thumbnailUrl: thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      screenshots: Array.isArray(screenshots) && screenshots.length > 0 ? screenshots : [thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"],
      repoUrl: repoUrl?.trim() || "",
      liveUrl: liveUrl?.trim() || "",
      isDraft: isDraft ?? false,
      isPublic: isPublic ?? true,
      isMainProject: Boolean(body.isMainProject),
      createdBy: (user.role === "OWNER" && body.createdBy) ? body.createdBy : user.id,
      collaboratorIds: Array.isArray(collaboratorIds) ? collaboratorIds : [],
    });

    // Notify Owner of new project submission
    const owners = await dataStore.getProfiles({ role: "OWNER" });
    owners.forEach((owner) => {
      dataStore.logAudit({
        actorId: user.id,
        actorName: user.displayName,
        targetId: newProject.id,
        action: "PROJECT_PUBLISHED",
        details: `${user.displayName} published project '${newProject.title}' in category ${newProject.category}.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    });

    return NextResponse.json({ success: true, project: newProject });
  } catch (err: any) {
    console.error("[POST /api/projects]", err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
