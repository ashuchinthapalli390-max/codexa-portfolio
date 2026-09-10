/**
 * GET /api/leadership/public
 * Returns canonical, admin-managed leadership profiles for public website display.
 * Strips all internal metadata, private keys, passwords, and sensitive information.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawProfiles = await db.teamProfile.findMany({
      where: {
        isPublic: true,
        OR: [
          { memberType: "LEADERSHIP" },
          { leadershipPosition: { not: null } },
          { user: { role: "OWNER" } },
        ],
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            skills: { orderBy: { displayOrder: "asc" } },
            links: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    const profiles = rawProfiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.user.username,
      slug: p.slug || p.user.username,
      displayName: p.displayName,
      name: p.displayName,
      role: p.primaryRole || p.user.role,
      primaryRole: p.primaryRole || "Leadership",
      leadershipPosition: p.leadershipPosition || (p.user.role === "OWNER" ? "FOUNDER" : "CORE_TEAM"),
      headline: p.headline || null,
      bio: p.publicBio || p.bio || null,
      publicBio: p.publicBio || p.bio || null,
      quote: p.quote || null,
      mediaUrl: p.mediaUrl || null,
      cropX: p.cropX,
      cropY: p.cropY,
      cropW: p.cropW,
      cropH: p.cropH,
      cropZoom: p.cropZoom,
      cropRotation: p.cropRotation,
      zoom: p.zoom,
      objectPosition: p.objectPosition,
      githubUrl: p.githubUrl || null,
      linkedinUrl: p.linkedinUrl || null,
      portfolioUrl: p.portfolioUrl || null,
      skills: p.user.skills.map((s) => s.skillName),
      featuredProjects: Array.isArray(p.featuredProjects) ? p.featuredProjects : [],
      displayOrder: p.displayOrder,
      isPublic: p.isPublic,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (err: any) {
    console.error("[GET /api/leadership/public] Database error:", err);
    // Safe graceful empty state on temporary database downtime
    return NextResponse.json(
      {
        success: false,
        error: "Database currently unavailable.",
        profiles: [],
      },
      { status: 503 }
    );
  }
}
