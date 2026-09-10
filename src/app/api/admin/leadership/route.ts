import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { isOwner, isCeoOrAdmin } from "@/lib/permissions";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function GET() {
  const actor = await getCurrentUser();

  if (!actor || (!isOwner(actor) && !isCeoOrAdmin(actor))) {
    return NextResponse.json({ error: "Forbidden. Admin or Owner access required." }, { status: 403 });
  }

  try {
    const profiles = await db.teamProfile.findMany({
      where: {
        OR: [
          { memberType: "LEADERSHIP" },
          { leadershipPosition: { not: null } },
          { user: { role: "OWNER" } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            firebaseUid: true,
            lastLoginAt: true,
            createdAt: true,
            skills: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ success: true, count: profiles.length, profiles });
  } catch (err: any) {
    console.error("[GET /api/admin/leadership] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();

  if (!actor || !isOwner(actor)) {
    return NextResponse.json({ error: "Forbidden. Founder / Owner authority required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      displayName,
      slug,
      primaryRole,
      leadershipPosition,
      headline,
      bio,
      publicBio,
      quote,
      mediaUrl,
      displayOrder = 0,
      isPublic = true,
      skills = [],
      featuredProjects = [],
    } = body;

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    const cleanName = displayName.trim();
    const generatedSlug = (slug || cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-")).replace(/-+/g, "-");

    // Check slug uniqueness
    const existing = await db.teamProfile.findFirst({
      where: {
        OR: [
          { slug: generatedSlug },
          { displayName: { equals: cleanName, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "A leadership profile with this name or slug already exists." }, { status: 409 });
    }

    // Generate unique username
    let baseUsername = generatedSlug.replace(/[^a-z0-9]/g, "") || "leader";
    let username = baseUsername;
    let counter = 1;
    while (await db.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter++}`;
    }

    // Create user and profile in transaction
    const newProfile = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: `${username}@codexa.agency`,
          fullName: cleanName,
          passwordHash: "MANAGED_LEADERSHIP_ACCOUNT",
          role: "ADMIN",
          isActive: true,
        },
      });

      const profile = await tx.teamProfile.create({
        data: {
          userId: user.id,
          slug: generatedSlug,
          displayName: cleanName,
          memberType: "LEADERSHIP",
          leadershipPosition: leadershipPosition || "TEAM_LEAD",
          primaryRole: primaryRole || "Core Leadership",
          headline: headline || null,
          bio: bio || null,
          publicBio: publicBio || bio || null,
          quote: quote || null,
          mediaUrl: mediaUrl || null,
          displayOrder: Number(displayOrder) || 0,
          isPublic: Boolean(isPublic),
          featuredProjects: featuredProjects || [],
          updatedBy: actor.username || actor.displayName,
        },
      });

      if (Array.isArray(skills) && skills.length > 0) {
        await tx.userSkill.createMany({
          data: skills.map((skillName: string, idx: number) => ({
            userId: user.id,
            skillName: String(skillName).trim(),
            displayOrder: idx,
          })),
          skipDuplicates: true,
        });
      }

      return profile;
    });

    // Invalidate public caches
    try {
      revalidatePath("/");
      revalidatePath("/team");
    } catch {}

    await logProfileAction(
      actor.id,
      newProfile.userId,
      "leadership_profile_created",
      `Owner created leadership profile: ${cleanName}`
    ).catch(() => {});

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (err: any) {
    console.error("[POST /api/admin/leadership] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
