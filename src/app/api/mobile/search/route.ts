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

    if (!query) {
      return NextResponse.json({
        ok: true,
        people: [],
        projects: [],
        posts: [],
        documents: [],
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    // 1. Search People
    const peoplePromise = db.user.findMany({
      where: {
        isActive: true,
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
          { department: { contains: query, mode: "insensitive" } },
          { employmentProfile: { designation: { contains: query, mode: "insensitive" } } },
        ],
      },
      take: 8,
      include: {
        profile: true,
        employmentProfile: { select: { designation: true, department: true } },
      },
    });

    // 2. Search Projects
    const projectsPromise = db.project.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { shortDesc: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        status: true,
        shortDesc: true,
      },
    });

    // 3. Search Posts
    const postsPromise = db.post.findMany({
      where: {
        isDeleted: false,
        content: { contains: query, mode: "insensitive" },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            profileMediaUrl: true,
            role: true,
          },
        },
      },
    });

    // 4. Search Documents (Only documents owned by caller or public)
    const docsPromise = db.documentItem.findMany({
      where: {
        userId: caller.id,
        title: { contains: query, mode: "insensitive" },
      },
      take: 6,
      select: {
        id: true,
        title: true,
        documentType: true,
        fileUrl: true,
        createdAt: true,
      },
    });

    const [peopleRaw, projectsRaw, postsRaw, docsRaw] = await Promise.all([
      peoplePromise,
      projectsPromise,
      postsPromise,
      docsPromise,
    ]);

    const people = peopleRaw.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName || u.profile?.displayName || u.username,
      role: u.role,
      designation: u.employmentProfile?.designation || u.profile?.primaryRole || u.role,
      department: u.department || u.employmentProfile?.department || "General",
      profileMediaUrl: u.profileMediaUrl || u.profile?.mediaUrl || null,
    }));

    const projects = projectsRaw.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category || "General",
      status: p.status || "Active",
      shortDesc: p.shortDesc || "",
    }));

    const posts = postsRaw.map((p) => ({
      id: p.id,
      content: p.content,
      authorName: p.author.fullName || p.author.username,
      authorUsername: p.author.username,
      authorAvatar: p.author.profileMediaUrl,
      createdAt: p.createdAt.toISOString(),
    }));

    const documents = docsRaw.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.documentType,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      people,
      projects,
      posts,
      documents,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/search error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Search failed." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
