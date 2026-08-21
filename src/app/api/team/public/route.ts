/**
 * GET /api/team/public
 * Returns public team profiles for CodeXa Agency using universal dataStore.
 */
import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { LEADERSHIP_DATA } from "@/config/leadershipData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawProfiles = await dataStore.getProfiles({ isPublic: true });

    // Override leadership text fields with locked constants from leadershipData.ts
    const profiles = rawProfiles.map((p) => {
      if (p.memberType === "LEADERSHIP" && p.leadershipPosition) {
        const locked = LEADERSHIP_DATA[p.leadershipPosition as "FOUNDER" | "CO_FOUNDER" | "CEO"];
        if (locked) {
          return {
            ...p,
            displayName: locked.name,
            publicBio: locked.quote,
          };
        }
      }
      return {
        ...p,
        publicBio: p.bio,
      };
    });

    return NextResponse.json({ success: true, profiles });
  } catch (err: any) {
    console.error("[GET /api/team/public] Error:", err);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
