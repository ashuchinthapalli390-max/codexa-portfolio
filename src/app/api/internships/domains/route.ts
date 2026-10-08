import { NextResponse } from "next/server";
import { INTERNSHIP_DOMAINS, CANONICAL_WORKFORCE_ROLES } from "@/lib/internships/domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/internships/domains
 * Returns authoritative canonical domains and workforce categories.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    domains: INTERNSHIP_DOMAINS.map((d) => ({
      key: d.key,
      label: d.label,
      durationMonths: d.durationMonths,
      durationLabel: d.durationLabel,
      baseDurationMonths: d.baseDurationMonths || d.durationMonths,
      extendedDurationMonths: d.extendedDurationMonths,
      canExtend: Boolean(d.canExtend),
      isActive: d.isActive,
    })),
    workforceRoles: CANONICAL_WORKFORCE_ROLES,
    durations: [
      { months: 2, label: "2 Months" },
      { months: 3, label: "3 Months" },
      { months: 6, label: "6 Months" },
      { months: 9, label: "9 Months" },
    ],
  });
}
