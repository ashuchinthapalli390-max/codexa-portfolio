/**
 * GET /api/team/public
 * Returns public team profiles.
 * For LEADERSHIP records, written content is overridden from locked leadershipData.ts config.
 * Only mediaUrl (uploaded photo/GIF) comes from SQLite for leadership.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LEADERSHIP_DATA } from "@/config/leadershipData";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rawProfiles = await db.teamProfile.findMany({
      where: {
        isPublic: true,
        OR: [
          { userId: null },
          { user: { isActive: true } },
        ],
      },
      select: {
        id: true,
        memberType: true,
        leadershipPosition: true,
        displayName: true,
        publicBio: true,
        mediaUrl: true,
        mediaMimeType: true,
        cropX: true,
        cropY: true,
        cropZoom: true,
        cropRotation: true,
        displayOrder: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    // Override leadership text fields with locked constants from leadershipData.ts
    const profiles = rawProfiles.map((p) => {
      if (p.memberType === "LEADERSHIP" && p.leadershipPosition) {
        const locked = LEADERSHIP_DATA[p.leadershipPosition as "FOUNDER" | "CO_FOUNDER" | "CEO"];
        if (locked) {
          return {
            ...p,
            displayName: locked.name,
            // publicBio is used as quote for the simple fallback; real detail comes from leadershipData client-side
            publicBio: locked.quote,
          };
        }
      }
      return p;
    });

    return NextResponse.json({ success: true, profiles });
  } catch (err) {
    console.error("[GET /api/team/public] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
