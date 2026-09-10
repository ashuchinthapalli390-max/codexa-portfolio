import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PERMANENT_FOUNDER_EMAIL } from "@/lib/firebase-session";

export const runtime = "nodejs";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;
  try {
    const profile = await db.teamProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            skills: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("[GET /api/admin/leadership/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const actor = await getCurrentUser();
  if (!actor || !isOwner(actor)) {
    return NextResponse.json({ error: "Forbidden. Founder / Owner access required." }, { status: 403 });
  }

  const { id } = params;

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
      displayOrder,
      isPublic,
      isActive,
      skills,
      featuredProjects,
    } = body;

    const profile = await db.teamProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Leadership profile not found." }, { status: 404 });
    }

    const isFounderAccount =
      profile.user?.email?.toLowerCase() === PERMANENT_FOUNDER_EMAIL.toLowerCase() ||
      profile.user?.role === "OWNER";

    // Build update payload
    const updateData: any = {
      updatedBy: actor.username || actor.displayName,
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (slug !== undefined) updateData.slug = slug ? slug.trim().toLowerCase() : null;
    if (primaryRole !== undefined) updateData.primaryRole = primaryRole.trim();
    if (leadershipPosition !== undefined) {
      // Prevent demoting Founder from executive position
      if (isFounderAccount && leadershipPosition !== "FOUNDER") {
        updateData.leadershipPosition = "FOUNDER";
      } else {
        updateData.leadershipPosition = leadershipPosition;
      }
    }
    if (headline !== undefined) updateData.headline = headline ? headline.trim() : null;
    if (bio !== undefined) updateData.bio = bio ? bio.trim() : null;
    if (publicBio !== undefined) updateData.publicBio = publicBio ? publicBio.trim() : null;
    if (quote !== undefined) updateData.quote = quote ? quote.trim() : null;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl || null;
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (featuredProjects !== undefined) updateData.featuredProjects = featuredProjects;

    const updatedProfile = await db.$transaction(async (tx) => {
      // Update linked user if active state modified (protect founder from being deactivated)
      if (isActive !== undefined && profile.userId) {
        if (!isFounderAccount) {
          await tx.user.update({
            where: { id: profile.userId },
            data: { isActive: Boolean(isActive) },
          });
        }
      }

      // Update skills if provided
      if (Array.isArray(skills) && profile.userId) {
        await tx.userSkill.deleteMany({ where: { userId: profile.userId } });
        if (skills.length > 0) {
          await tx.userSkill.createMany({
            data: skills.map((s: string, idx: number) => ({
              userId: profile.userId,
              skillName: String(s).trim(),
              displayOrder: idx,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.teamProfile.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              isActive: true,
              skills: { orderBy: { displayOrder: "asc" } },
            },
          },
        },
      });
    });

    // Invalidate public page caches
    try {
      revalidatePath("/");
      revalidatePath("/team");
    } catch {}

    await logProfileAction(
      actor.id,
      profile.userId,
      "leadership_profile_updated",
      `Owner updated leadership profile: ${updatedProfile.displayName}`
    ).catch(() => {});

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err: any) {
    console.error("[PATCH /api/admin/leadership/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const actor = await getCurrentUser();
  if (!actor || !isOwner(actor)) {
    return NextResponse.json({ error: "Forbidden. Founder / Owner access required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const profile = await db.teamProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Leadership profile not found." }, { status: 404 });
    }

    // STRICT INVARIANT: Founder profile cannot be deleted
    if (
      profile.user?.email?.toLowerCase() === PERMANENT_FOUNDER_EMAIL.toLowerCase() ||
      profile.user?.role === "OWNER" ||
      profile.leadershipPosition === "FOUNDER"
    ) {
      return NextResponse.json(
        { error: "Security Protection: The CodeXa Founder / Owner profile cannot be deleted." },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.teamProfile.delete({ where: { id } });
      if (profile.userId) {
        await tx.user.delete({ where: { id: profile.userId } }).catch(() => {});
      }
    });

    try {
      revalidatePath("/");
      revalidatePath("/team");
    } catch {}

    await logProfileAction(
      actor.id,
      profile.userId,
      "leadership_profile_deleted",
      `Owner deleted leadership profile: ${profile.displayName}`
    ).catch(() => {});

    return NextResponse.json({ success: true, message: "Leadership profile deleted successfully." });
  } catch (err: any) {
    console.error("[DELETE /api/admin/leadership/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
