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
    const category = (searchParams.get("category")?.trim() || "all").toLowerCase();

    if (!query) {
      return NextResponse.json({
        ok: true,
        results: [],
        categories: {
          people: [],
          messages: [],
          projects: [],
          classes: [],
          assignments: [],
          documents: [],
          posts: [],
        },
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    const shouldSearch = (cat: string) => category === "all" || category === cat;

    // 1. Search People (Core Users)
    const peoplePromise = shouldSearch("people")
      ? db.user.findMany({
          where: {
            isActive: true,
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
              { department: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 10,
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            profileMediaUrl: true,
            department: true,
          },
        })
      : Promise.resolve([]);

    // 2. Search Messages (Only in conversations caller belongs to)
    const messagesPromise = shouldSearch("messages")
      ? db.message.findMany({
          where: {
            isDeleted: false,
            message: { contains: query, mode: "insensitive" },
            conversation: {
              members: {
                some: { userId: caller.id },
              },
            },
          },
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            conversation: {
              select: { id: true, title: true, type: true },
            },
            sender: {
              select: { id: true, username: true, fullName: true, profileMediaUrl: true },
            },
          },
        })
      : Promise.resolve([]);

    // 3. Search Projects
    const projectsPromise = shouldSearch("projects")
      ? db.project.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { shortDesc: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 8,
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            slug: true,
          },
        })
      : Promise.resolve([]);

    // 4. Search Scheduled Classes & Topics
    const classesPromise = (shouldSearch("classes") || shouldSearch("topics"))
      ? db.scheduledClass.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { topic: { contains: query, mode: "insensitive" } },
              { domain: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 8,
          orderBy: { classDate: "desc" },
          select: {
            id: true,
            title: true,
            topic: true,
            classDate: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        })
      : Promise.resolve([]);

    // 5. Search Assignments
    const assignmentsPromise = shouldSearch("assignments")
      ? db.assignment.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { domain: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 8,
          orderBy: { dueDate: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            domain: true,
          },
        })
      : Promise.resolve([]);

    // 6. Search Documents (Authorized documents belonging to caller)
    const docsPromise = shouldSearch("documents")
      ? db.documentItem.findMany({
          where: {
            userId: caller.id,
            title: { contains: query, mode: "insensitive" },
          },
          take: 8,
          select: {
            id: true,
            title: true,
            documentType: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]);

    // 7. Search Posts
    const postsPromise = shouldSearch("posts")
      ? db.post.findMany({
          where: {
            isDeleted: false,
            content: { contains: query, mode: "insensitive" },
          },
          take: 8,
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                fullName: true,
                profileMediaUrl: true,
              },
            },
          },
        })
      : Promise.resolve([]);

    const [peopleRaw, messagesRaw, projectsRaw, classesRaw, assignmentsRaw, docsRaw, postsRaw] =
      await Promise.all([
        peoplePromise,
        messagesPromise,
        projectsPromise,
        classesPromise,
        assignmentsPromise,
        docsPromise,
        postsPromise,
      ]);

    // Map into unified SearchResultItem models
    const peopleResults = (peopleRaw as any[]).map((u) => ({
      category: "people",
      id: u.id,
      title: u.fullName || u.username,
      subtitle: `@${u.username} • ${u.role || 'Member'}`,
      meta: u.username,
      route: `/profile/${u.username}`,
    }));

    const messagesResults = (messagesRaw as any[]).map((m) => {
      const convTitle = m.conversation?.title || (m.conversation?.type === 'DIRECT' ? 'Direct Message' : 'Group Chat');
      const senderName = m.sender?.fullName || m.sender?.username || 'Member';
      return {
        category: "messages",
        id: m.id,
        title: m.message,
        subtitle: `${convTitle} • ${senderName}`,
        meta: m.conversationId,
        route: `/chat/${m.conversationId}?name=${encodeURIComponent(convTitle)}&messageId=${m.id}`,
      };
    });

    const projectsResults = (projectsRaw as any[]).map((p) => ({
      category: "projects",
      id: p.id,
      title: p.title,
      subtitle: `${p.category || 'Project'} • ${p.status || 'Active'}`,
      meta: p.id,
      route: `/projects`,
    }));

    const classesResults = (classesRaw as any[]).map((c) => ({
      category: "classes",
      id: c.id,
      title: c.title,
      subtitle: `${c.topic} • ${c.startTime} - ${c.endTime}`,
      meta: c.id,
      route: `/topics`,
    }));

    const assignmentsResults = (assignmentsRaw as any[]).map((a) => {
      const dueStr = a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : '';
      return {
        category: "assignments",
        id: a.id,
        title: a.title,
        subtitle: `Due: ${dueStr} • ${a.status || 'Active'}`,
        meta: a.id,
        route: `/assignments`,
      };
    });

    const docsResults = (docsRaw as any[]).map((d) => ({
      category: "documents",
      id: d.id,
      title: d.title,
      subtitle: d.documentType || 'Document',
      meta: d.id,
      route: `/documents`,
    }));

    const postsResults = (postsRaw as any[]).map((p) => {
      const author = p.author?.fullName || p.author?.username || 'CodeXa';
      return {
        category: "posts",
        id: p.id,
        title: p.content.length > 80 ? p.content.substring(0, 80) + '...' : p.content,
        subtitle: `Posted by ${author}`,
        meta: p.id,
        route: `/feed`,
      };
    });

    const allResults = [
      ...peopleResults,
      ...messagesResults,
      ...projectsResults,
      ...classesResults,
      ...assignmentsResults,
      ...docsResults,
      ...postsResults,
    ];

    return NextResponse.json({
      ok: true,
      results: allResults,
      categories: {
        people: peopleResults,
        messages: messagesResults,
        projects: projectsResults,
        classes: classesResults,
        assignments: assignmentsResults,
        documents: docsResults,
        posts: postsResults,
      },
      people: peopleResults,
      projects: projectsResults,
      posts: postsResults,
      documents: docsResults,
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
