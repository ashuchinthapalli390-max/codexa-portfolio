import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const domains = await db.trainingDomain.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: {
            internProfiles: true,
            classLinks: true,
          }
        }
      }
    });

    const formatted = domains.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      displayName: d.displayName,
      durationMonths: d.durationMonths,
      description: d.description,
      internCount: d._count.internProfiles,
      classCount: d._count.classLinks,
    }));

    return NextResponse.json({
      ok: true,
      domains: formatted,
      totalDomains: formatted.length,
      totalEnrolledInterns: formatted.reduce((sum, d) => sum + d.internCount, 0),
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/training/domains]", err);
    return NextResponse.json({ ok: false, error: "Failed to load domain master directory" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
