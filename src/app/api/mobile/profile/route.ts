import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
import { formatProfileMediaUrl } from "@/lib/profile-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const authUser = await resolveRequestUser(req);
    if (!authUser) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: {
        profile: true,
        employmentProfile: true,
        skills: { orderBy: { displayOrder: "asc" } },
        links: { orderBy: { displayOrder: "asc" } },
      },
    });

    if (!user) return NextResponse.json({ ok: false, error: { code: "USER_NOT_FOUND" } }, { status: 404 });

    return NextResponse.json({
      ok: true,
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.profile?.displayName || user.username,
        role: user.role,
        department: user.department || user.employmentProfile?.department,
        designation: user.employmentProfile?.designation || user.profile?.primaryRole,
        employeeId: user.employmentProfile?.employeeId,
        bio: user.profile?.bio || user.profile?.headline,
        status: user.profile?.headline || "Available",
        profileMediaUrl: formatProfileMediaUrl(user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl),
        cropX: user.cropX ?? user.profile?.cropX ?? 0,
        cropY: user.cropY ?? user.profile?.cropY ?? 0,
        zoom: user.zoom ?? user.profile?.zoom ?? 1,
        githubUrl: user.profile?.githubUrl,
        linkedinUrl: user.profile?.linkedinUrl,
        portfolioUrl: user.profile?.portfolioUrl,
        skills: user.skills.map((s) => s.skillName),
        links: user.links.map((l) => ({ label: l.label, url: l.url })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await resolveRequestUser(req);
    if (!authUser) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const { bio, status, headline, githubUrl, linkedinUrl, portfolioUrl, profileMediaUrl, cropX, cropY, zoom, skills } = body;

    const resolvedStatus = status || headline;

    // Update TeamProfile
    await db.teamProfile.upsert({
      where: { userId: authUser.id },
      update: {
        ...(bio !== undefined && { bio }),
        ...(resolvedStatus !== undefined && { headline: resolvedStatus }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(portfolioUrl !== undefined && { portfolioUrl }),
        ...(profileMediaUrl !== undefined && { profileMediaUrl, mediaUrl: profileMediaUrl }),
        ...(cropX !== undefined && { cropX: Number(cropX) }),
        ...(cropY !== undefined && { cropY: Number(cropY) }),
        ...(zoom !== undefined && { zoom: Number(zoom) }),
      },
      create: {
        userId: authUser.id,
        displayName: authUser.displayName,
        bio,
        headline: resolvedStatus,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        profileMediaUrl,
        mediaUrl: profileMediaUrl,
        cropX: cropX ? Number(cropX) : 0,
        cropY: cropY ? Number(cropY) : 0,
        zoom: zoom ? Number(zoom) : 1,
      },
    });

    // Update User model fields
    const userUpdate: any = {};
    if (profileMediaUrl !== undefined) userUpdate.profileMediaUrl = profileMediaUrl;
    if (cropX !== undefined) userUpdate.cropX = Number(cropX);
    if (cropY !== undefined) userUpdate.cropY = Number(cropY);
    if (zoom !== undefined) userUpdate.zoom = Number(zoom);

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({
        where: { id: authUser.id },
        data: userUpdate,
      });
    }

    // Update skills if provided
    if (Array.isArray(skills)) {
      await db.userSkill.deleteMany({ where: { userId: authUser.id } });
      for (let i = 0; i < skills.length; i++) {
        await db.userSkill.create({
          data: {
            userId: authUser.id,
            skillName: String(skills[i]).trim(),
            displayOrder: i,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, message: "Profile updated successfully." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}

export const PUT = PATCH;