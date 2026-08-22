/**
 * GET /api/team/public
 * Returns public team profiles for CodeXa Agency using universal dataStore (PostgreSQL Source of Truth).
 * Safe public data: no passwords, no emails (unless public), no 2FA keys, no internal auth data.
 */
import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawProfiles = await dataStore.getProfiles({ isPublic: true });

    // Sanitize and return public profile fields only
    const profiles = rawProfiles.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      role: p.role,
      memberType: p.memberType,
      leadershipPosition: p.leadershipPosition || null,
      primaryRole: p.primaryRole || null,
      headline: p.headline || null,
      bio: p.bio || null,
      publicBio: p.publicBio || p.bio || null,
      skills: p.skills || [],
      featuredProjects: p.featuredProjects || [],
      expertiseGroups: p.expertiseGroups || {},
      mediaUrl: p.mediaUrl || null,
      githubUrl: p.githubUrl || null,
      linkedinUrl: p.linkedinUrl || null,
      portfolioUrl: p.portfolioUrl || null,
      displayOrder: p.displayOrder || 0,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ success: true, profiles });
  } catch (err: any) {
    console.error("[GET /api/team/public] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
