import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole, hasPermission, Permission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { message = "", context = {} } = body;
    const query = message.trim();

    if (!query) {
      return NextResponse.json({ ok: false, error: { code: "EMPTY_QUERY", message: "Query message cannot be empty." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const effectiveRole = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER"].includes(effectiveRole);

    // ── RBAC Security Filter ──
    const lowercaseQuery = query.toLowerCase();
    const isAskingUnauthorizedPayment = (lowercaseQuery.includes("payment") || lowercaseQuery.includes("salary") || lowercaseQuery.includes("stipend") || lowercaseQuery.includes("bank") || lowercaseQuery.includes("founder money")) && !isLeadership;

    if (isAskingUnauthorizedPayment && (lowercaseQuery.includes("founder") || lowercaseQuery.includes("all") || lowercaseQuery.includes("other") || lowercaseQuery.includes("everyone"))) {
      return NextResponse.json({
        ok: true,
        reply: "I cannot fulfill this request. Under CodeXa security and privacy policies, access to organizational financial records and leadership transactions is strictly restricted by role-based access control.",
        suggestions: ["What are my assigned projects?", "How do I mark attendance?", "Draft a leave request"],
      }, { headers: NO_CACHE_HEADERS });
    }

    // ── Load permitted workspace context for current user ──
    const [userProjects, userAttendance, userLeave] = await Promise.all([
      db.project.findMany({
        where: isLeadership
          ? undefined
          : {
              OR: [
                { collaborators: { some: { userId: user.id } } },
                { createdBy: user.id },
              ],
            },
        select: { id: true, title: true, status: true, category: true, techStack: true },
        take: 5,
      }),
      db.attendanceRecord.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
        take: 5,
      }),
      db.leaveRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    // Check if Gemini API key exists in server environment
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const systemPrompt = `You are CodeXa AI, an intelligent, concise, and professional workspace assistant built for CodeXa Agency team members.
Current User Context:
- Name: ${user.displayName || user.username}
- Role: ${effectiveRole}
- Assigned Projects: ${userProjects.map((p) => `${p.title} (${p.status})`).join(", ") || "No projects assigned"}
- Recent Attendance: ${userAttendance.length} records logged
- Security Constraint: You must strictly adhere to role-based access control. Never disclose private administrative, salary, financial, or security data outside the user's role. Keep answers crisp, technical, actionable, and formatted in markdown.`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }] },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return NextResponse.json({
              ok: true,
              reply: generatedText.trim(),
              suggestions: ["Summarize my project", "Help me draft a message", "Review my attendance"],
            }, { headers: NO_CACHE_HEADERS });
          }
        }
      } catch (e) {
        console.warn("[Gemini API call warning]", e);
      }
    }

    // ── Deterministic Workplace Assistant Engine (Fallback) ──
    let reply = "";
    const suggestions: string[] = [];

    if (lowercaseQuery.includes("project") || lowercaseQuery.includes("task")) {
      if (userProjects.length === 0) {
        reply = "You are currently not assigned to any active client projects in CodeXa Core DB. Reach out to your Team Lead or CTO for task allocations.";
      } else {
        reply = `Here is your current CodeXa project status:\n\n` +
          userProjects.map((p, i) => `${i + 1}. **${p.title}** — Status: \`${p.status}\` | Stack: ${p.techStack.slice(0, 3).join(", ") || "General"}`).join("\n") +
          `\n\nWould you like me to draft a daily standup update for any of these?`;
        suggestions.push("Draft standup update", "Explain tech stack");
      }
    } else if (lowercaseQuery.includes("attendance")) {
      reply = `**Attendance Overview:**\n- You have **${userAttendance.length}** recent attendance logs on record.\n- Attendance windows open on working days according to executive schedules.\n- To request a missing check-in, use the **Correction Request** option in the Attendance tab.`;
      suggestions.push("Open Attendance tab", "Submit correction ticket");
    } else if (lowercaseQuery.includes("leave") || lowercaseQuery.includes("day off")) {
      reply = `**Draft Leave Request:**\n\n*Subject:* Leave Application — ${user.displayName || user.username} (${effectiveRole})\n\n"Dear Team Lead / HR,\n\nI would like to request leave on [Date] due to [Reason: Academic / Personal / Medical]. I will ensure all pending project tasks are communicated to the team before my absence.\n\nBest regards,\n${user.displayName || user.username}"`;
      suggestions.push("Submit in Leave tab", "Check leave balance");
    } else if (lowercaseQuery.includes("update") || lowercaseQuery.includes("standup")) {
      const projName = userProjects[0]?.title || "Assigned Project";
      reply = `**Daily Standup Draft:**\n\n- **Yesterday:** Completed component architecture and API integration for ${projName}.\n- **Today:** Working on bug triage, performance tuning, and unit validation.\n- **Blockers:** None currently. Ready for staging review.`;
      suggestions.push("Copy to clipboard", "Post to project feed");
    } else {
      reply = `Hello ${user.displayName || user.username}! I am **CodeXa AI**, your daily team workspace assistant.\n\nI can help you with:\n- **Assigned Projects:** Review status and requirements\n- **Standup Updates:** Draft crisp professional progress reports\n- **Leave Requests:** Formulate official HR applications\n- **Documentation:** Search platform guidance and operational guidelines\n\nHow can I support your workflow today?`;
      suggestions.push("My assigned projects", "Draft standup update", "How to submit leave");
    }

    return NextResponse.json({
      ok: true,
      reply,
      suggestions,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/ai/chat] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "CodeXa AI is temporarily unavailable." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
