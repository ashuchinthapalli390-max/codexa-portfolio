import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const DEFAULT_SETTINGS = {
  enabled: true,
  model: "gemini-flash-latest",
  allowedRoles: ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "EMPLOYEE", "INTERN"],
  instructions: "You are CodeXa AI, an intelligent, professional workspace assistant built exclusively for CodeXa Agency team members and interns. Provide strictly accurate, agency-grounded assistance.",
  knowledgeSources: ["Syllabus & Daily Topics", "Scheduled Classes", "Official Internship Handbooks", "Project Assignments", "Attendance Policies"],
  sanitizeMarkdown: true,
  maxTokensPerResponse: 600,
  rateLimitPerUserDaily: 100,
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!isLeadership) {
      return NextResponse.json({ ok: false, error: "Forbidden. Leadership only." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const settingRecord = await db.siteSetting.findUnique({
      where: { key: "codexa_ai_config" },
    });

    let config = { ...DEFAULT_SETTINGS };
    if (settingRecord?.value) {
      try {
        config = { ...config, ...JSON.parse(settingRecord.value) };
      } catch (_) {}
    }

    // Explicitly do NOT expose the raw GEMINI_API_KEY. Only expose boolean hasApiKey
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);

    return NextResponse.json({
      ok: true,
      config,
      hasApiKey,
      activeProvider: "Google Gemini Flash (Server-Side Secure)",
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/ai/settings]", err);
    return NextResponse.json({ ok: false, error: "Failed to load AI settings" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "OWNER", "ADMIN"].includes(role);
    if (!isLeadership) {
      return NextResponse.json({ ok: false, error: "Forbidden. Only Founders/Leadership can update AI behavior." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      enabled,
      model,
      allowedRoles,
      instructions,
      knowledgeSources,
      sanitizeMarkdown,
      maxTokensPerResponse,
      rateLimitPerUserDaily,
    } = body;

    const payload = {
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      model: model || "gemini-flash-latest",
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : DEFAULT_SETTINGS.allowedRoles,
      instructions: instructions || DEFAULT_SETTINGS.instructions,
      knowledgeSources: Array.isArray(knowledgeSources) ? knowledgeSources : DEFAULT_SETTINGS.knowledgeSources,
      sanitizeMarkdown: sanitizeMarkdown !== undefined ? Boolean(sanitizeMarkdown) : true,
      maxTokensPerResponse: Number(maxTokensPerResponse) || 600,
      rateLimitPerUserDaily: Number(rateLimitPerUserDaily) || 100,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    await db.siteSetting.upsert({
      where: { key: "codexa_ai_config" },
      update: { value: JSON.stringify(payload) },
      create: { key: "codexa_ai_config", value: JSON.stringify(payload) },
    });

    return NextResponse.json({
      ok: true,
      message: "CodeXa AI configuration saved and synced across platforms.",
      config: payload,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/ai/settings]", err);
    return NextResponse.json({ ok: false, error: "Failed to save AI configuration: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
