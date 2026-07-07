/**
 * GET & POST /api/admin/team
 * GET: Fetch all profiles (Leadership & Core Team) for admin search/filter table
 * POST: Create a new Core Team member login and profile (accepts multipart/form-data)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { uploadProfileMedia, UploadError } from "@/lib/upload";

export const runtime = "nodejs";

const BCRYPT_ROUNDS = 12;

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$*%";
  let pass = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

export async function GET() {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. OWNER role required." }, { status: 403 });
  }

  try {
    const profiles = await db.teamProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { memberType: "asc" }, // LEADERSHIP first
        { displayOrder: "asc" },
      ],
    });

    return NextResponse.json({ success: true, profiles });
  } catch (err) {
    console.error("[GET /api/admin/team] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. OWNER role required." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const displayName = formData.get("displayName") as string | null;
    const publicBio = formData.get("publicBio") as string | null;
    const isPublic = formData.get("isPublic") !== "false"; // Default to true
    const displayOrder = Number(formData.get("displayOrder")) || 0;
    const file = formData.get("profileMedia") as File | null;

    if (!displayName || displayName.trim() === "") {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    // Generate unique username: name.codexa-1234
    const namePrefix = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (namePrefix.length === 0) {
      return NextResponse.json({ error: "Invalid display name. Use letters/numbers." }, { status: 400 });
    }

    let username = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      username = `${namePrefix}.codexa-${suffix}`;
      const existing = await db.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      username = `${namePrefix}.codexa-${Date.now()}`;
    }

    // Generate secure temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    // Save profile image to Vercel Blob (no local filesystem)
    let finalMediaUrl: string | null = null;
    let finalMediaMimeType: string | null = null;

    if (file && file.size > 0) {
      // Use a temporary placeholder userId for new members (real ID created inside tx)
      // We upload with a consistent path using a unique timestamp key
      const tempKey = `new-${Date.now()}`;
      try {
        const result = await uploadProfileMedia(file, tempKey);
        finalMediaUrl = result.url;
        finalMediaMimeType = result.mimeType;
      } catch (err) {
        if (err instanceof UploadError) {
          return NextResponse.json(
            { error: "Profile media could not be saved. Please try again." },
            { status: err.code === "FILE_TOO_LARGE" ? 413 : err.code === "INVALID_MEDIA_TYPE" ? 415 : 502 }
          );
        }
        throw err;
      }
    }

    // Create User & Profile in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          role: "TEAM_MEMBER",
          isActive: true,
        },
      });

      const profile = await tx.teamProfile.create({
        data: {
          userId: user.id,
          memberType: "CORE_TEAM",
          displayName: displayName.trim(),
          publicBio: publicBio ? publicBio.trim() : null,
          mediaUrl: finalMediaUrl,
          mediaMimeType: finalMediaMimeType,
          isPublic,
          displayOrder,
        },
      });

      return { user, profile };
    });

    // Log audit log
    await logProfileAction(
      actor.id,
      result.user.id,
      "team_member_created",
      `Owner created team login for ${displayName} with username ${username}`
    );

    return NextResponse.json({
      success: true,
      username,
      tempPassword,
      profile: result.profile,
    });
  } catch (err) {
    console.error("[POST /api/admin/team] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
