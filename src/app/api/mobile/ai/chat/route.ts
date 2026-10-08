import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

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

/**
 * Sanitizes markdown output to eliminate unwanted artifacts like `***`
 * while preserving valid bold, italic, lists, and code blocks.
 */
function sanitizeAiMarkdown(text: string): string {
  if (!text) return "";
  let cleaned = text;

  // Replace lines consisting only of asterisks like *** or ****
  cleaned = cleaned.replace(/^\s*\*{3,}\s*$/gm, "---");

  // Replace excessive asterisks in headers or inline text (e.g. ***bold*** or ****text****)
  cleaned = cleaned.replace(/\*{4,}/g, "**");
  cleaned = cleaned.replace(/(?<!\*)\*\*\*(?!\*)/g, "**");

  // Clean trailing spaces
  cleaned = cleaned.replace(/[ \t]+$/gm, "");

  // Clean excessive blank lines (more than 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message = "" } = body;
    const query = message.trim();

    if (!query) {
      return NextResponse.json(
        { ok: false, error: { code: "EMPTY_QUERY", message: "Query message cannot be empty." } },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const effectiveRole = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER"].includes(effectiveRole);
    const lowercaseQuery = query.toLowerCase();

    // ── RBAC Security Filter ──
    const isAskingUnauthorizedPayment =
      (lowercaseQuery.includes("salary") ||
        lowercaseQuery.includes("stipend") ||
        lowercaseQuery.includes("bank account") ||
        lowercaseQuery.includes("founder money") ||
        lowercaseQuery.includes("revenue") ||
        lowercaseQuery.includes("financial secret")) &&
      !isLeadership;

    if (
      isAskingUnauthorizedPayment &&
      (lowercaseQuery.includes("founder") ||
        lowercaseQuery.includes("all") ||
        lowercaseQuery.includes("other") ||
        lowercaseQuery.includes("company"))
    ) {
      return NextResponse.json(
        {
          ok: true,
          reply:
            "I cannot fulfill this request. Under CodeXa security and privacy policies, access to organizational financial records and leadership transactions is strictly restricted by role-based access control.",
          suggestions: [
            "What are my assigned projects?",
            "How do I mark attendance?",
            "What class do I have today?",
          ],
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ── Scope Guard (Redirect completely unrelated topics) ──
    const unrelatedTopics = [
      "recipe",
      "cook ",
      "movie ",
      "song lyrics",
      "football",
      "cricket match",
      "weather in",
      "horoscope",
      "joke",
      "dating",
    ];
    const isUnrelated = unrelatedTopics.some((t) => lowercaseQuery.includes(t));
    if (isUnrelated) {
      return NextResponse.json(
        {
          ok: true,
          reply:
            "I am **CodeXa AI**, your dedicated workspace assistant for CodeXa Agency. I focus on your internship, scheduled classes, daily topics, project assignments, attendance, and technical development. How can I assist you with your CodeXa tasks or coursework today?",
          suggestions: [
            "What class do I have today?",
            "Show my internship details",
            "What assignments are due?",
          ],
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // ── Load permitted workspace context from Database ──
    const todayStr = new Date().toISOString().split("T")[0];

    const [
      userProfile,
      employment,
      userProjects,
      userAttendance,
      userLeave,
      todayClasses,
      upcomingClasses,
      pendingAssignments,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: {
          fullName: true,
          username: true,
          role: true,
          department: true,
        },
      }),
      db.employmentProfile.findUnique({
        where: { userId: user.id },
      }),
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
      db.$queryRawUnsafe<any[]>(
        `
        SELECT title, domain, topic, subtopics, instructor_name, start_time, end_time, status, meeting_link
        FROM scheduled_classes
        WHERE class_date = $1::date
        ORDER BY start_time ASC
      `,
        todayStr
      ).catch(() => []),
      db.$queryRawUnsafe<any[]>(
        `
        SELECT title, domain, topic, instructor_name, to_char(class_date, 'YYYY-MM-DD') as class_date, start_time, end_time
        FROM scheduled_classes
        WHERE class_date > $1::date
        ORDER BY class_date ASC, start_time ASC
        LIMIT 3
      `,
        todayStr
      ).catch(() => []),
      db.$queryRawUnsafe<any[]>(
        `
        SELECT title, due_date, status
        FROM assignments
        WHERE status != 'GRADED'
        LIMIT 3
      `
      ).catch(() => []),
    ]);

    const fullName = userProfile?.fullName || user.displayName || user.username || "Team Member";
    const employeeId = employment?.employeeId || "CXA-INT-2026";
    const domain = employment?.internshipDomain || userProfile?.department || "Software Engineering";
    const mentor = employment?.mentorName || "Assigned Domain Lead";
    const startDate = employment?.internshipStartDate
      ? employment.internshipStartDate.toISOString().split("T")[0]
      : "October 2026";
    const endDate = employment?.internshipEndDate
      ? employment.internshipEndDate.toISOString().split("T")[0]
      : "December 2026";

    // ── Gemini API Integration (Server-side only) ──
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const systemPrompt = `You are CodeXa AI, an intelligent, professional, and accurate workspace assistant built exclusively for CodeXa Agency team members and interns.
Your responses must be grounded strictly in official CodeXa organization context and permitted real data.

OFFICIAL USER CONTEXT:
- Name: ${fullName}
- Username: ${user.username}
- Role: ${effectiveRole}
- Official Employee/Intern ID: ${employeeId}
- Assigned Domain: ${domain}
- Mentor: ${mentor}
- Internship Timeline: ${startDate} to ${endDate}
- Assigned Projects: ${userProjects.map((p) => `${p.title} (${p.status})`).join(", ") || "No projects assigned currently"}
- Recent Attendance Logs: ${userAttendance.length} records logged
- Today's Classes (${todayStr}): ${
          todayClasses.length > 0
            ? todayClasses.map((c) => `${c.title} - ${c.topic} (${c.start_time} - ${c.end_time}, Instructor: ${c.instructor_name})`).join("; ")
            : "No classes scheduled for today"
        }
- Upcoming Classes: ${
          upcomingClasses.length > 0
            ? upcomingClasses.map((c) => `${c.title} on ${c.class_date} (${c.topic})`).join("; ")
            : "No upcoming classes currently listed"
        }
- Pending Assignments: ${
          pendingAssignments.length > 0
            ? pendingAssignments.map((a: any) => `${a.title}`).join(", ")
            : "No pending assignments"
        }

BEHAVIOR DIRECTIVES:
1. Be concise, technical, and helpful.
2. Focus ONLY on CodeXa agency operations, development, classes, topics, attendance, leave, and assignments.
3. NEVER make up fake organizational facts or invent people.
4. Format responses cleanly using standard GitHub-style Markdown.
5. NEVER output triple asterisks (***) or broken markdown symbols. Use clean bullet points (-) and bold (**text**).
6. When answering about today's class or topics, use the exact classes provided above.`;

        const geminiModel = process.env.CODEXA_AI_MODEL || "gemini-1.5-flash";
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanReply = sanitizeAiMarkdown(rawText);
            return NextResponse.json(
              {
                ok: true,
                reply: cleanReply,
                suggestions: [
                  "What class do I have today?",
                  "Show my internship details",
                  "Draft a daily standup update",
                ],
              },
              { headers: NO_CACHE_HEADERS }
            );
          }
        }
      } catch (geminiErr) {
        console.warn("[Gemini API warning, falling back to Knowledge Engine]", geminiErr);
      }
    }

    // ── Deterministic CodeXa Knowledge Engine (Fallback & Ground Truth) ──
    let reply = "";
    const suggestions: string[] = [];

    if (
      lowercaseQuery.includes("class") ||
      lowercaseQuery.includes("topic") ||
      lowercaseQuery.includes("lecture") ||
      lowercaseQuery.includes("schedule")
    ) {
      if (todayClasses.length > 0) {
        const cls = todayClasses[0];
        let subList = "";
        try {
          const subs = Array.isArray(cls.subtopics) ? cls.subtopics : JSON.parse(cls.subtopics || "[]");
          if (subs.length > 0) {
            subList = `\n**Subtopics Covered:**\n` + subs.map((s: any) => `- ${s}`).join("\n");
          }
        } catch (_) {}

        reply = `**Today's Scheduled Class:**\n\n- **Title:** ${cls.title}\n- **Topic:** ${cls.topic}\n- **Instructor:** ${cls.instructor_name}\n- **Time:** ${cls.start_time} - ${cls.end_time}\n- **Status:** \`${cls.status}\`${subList}\n\nYou can access the live session link and download class resources directly from the **Attendance & Classes** tab.`;
        suggestions.push("Open Attendance tab", "What assignments are due?", "Tomorrow's schedule");
      } else if (upcomingClasses.length > 0) {
        reply = `No classes are scheduled for today. Here is your next upcoming session:\n\n` +
          upcomingClasses.map((c) => `- **${c.title}** on ${c.class_date} (${c.start_time} - ${c.end_time})\n  Topic: ${c.topic} | Instructor: ${c.instructor_name}`).join("\n\n");
        suggestions.push("View Daily Topics", "Review past classes");
      } else {
        reply = `There are currently no classes scheduled for today in CodeXa Core records. Please check the **Daily Topics** section for upcoming curriculum updates.`;
        suggestions.push("View Daily Topics", "Check assignments");
      }
    } else if (
      lowercaseQuery.includes("internship") ||
      lowercaseQuery.includes("domain") ||
      lowercaseQuery.includes("mentor") ||
      lowercaseQuery.includes("end date") ||
      lowercaseQuery.includes("start date")
    ) {
      reply = `**Official Internship Profile (${employeeId}):**\n\n- **Domain:** ${domain}\n- **Role:** ${effectiveRole}\n- **Assigned Mentor:** ${mentor}\n- **Duration:** ${startDate} to ${endDate}\n- **Status:** Active\n\nAll verified internship documents and offer letters can be reviewed under the **Documents** section.`;
      suggestions.push("View Documents", "What class do I have today?", "Review my attendance");
    } else if (lowercaseQuery.includes("project") || lowercaseQuery.includes("task")) {
      if (userProjects.length === 0) {
        reply = `You are currently not assigned to any active client projects in CodeXa Core DB. Reach out to your Team Lead or CTO for task allocations in your domain (${domain}).`;
      } else {
        reply =
          `Here is your current CodeXa project status:\n\n` +
          userProjects
            .map(
              (p, i) =>
                `${i + 1}. **${p.title}** — Status: \`${p.status}\` | Tech Stack: ${p.techStack.slice(0, 3).join(", ") || "General"}`
            )
            .join("\n") +
          `\n\nWould you like me to draft a daily standup update for any of these?`;
        suggestions.push("Draft standup update", "Explain tech stack");
      }
    } else if (lowercaseQuery.includes("attendance")) {
      reply = `**Attendance Overview:**\n- You have **${userAttendance.length}** recent attendance logs on record.\n- Attendance windows open on working days according to executive schedules.\n- To request a missing check-in, use the **Correction Request** option in the Attendance tab.`;
      suggestions.push("Open Attendance tab", "Submit correction ticket");
    } else if (lowercaseQuery.includes("leave") || lowercaseQuery.includes("day off")) {
      reply = `**Official Leave Application Guidelines:**\n\nYou can submit a formal leave request directly inside the **Leave Requests** section.\n\n**Supported Leave Types:**\n- \`CASUAL\` (Planned personal leave)\n- \`SICK\` (Medical absence)\n- \`EMERGENCY\` (Urgent personal situations)\n- \`ACADEMIC\` (College exams or laboratory work)\n\nOnce submitted, your request is routed to Founder and HR for review. You will receive an immediate notification upon approval.`;
      suggestions.push("Open Leave screen", "Check leave history");
    } else if (lowercaseQuery.includes("update") || lowercaseQuery.includes("standup")) {
      const projName = userProjects[0]?.title || `${domain} Module`;
      reply = `**Daily Standup Draft:**\n\n- **Yesterday:** Completed component architecture and API integration for ${projName}.\n- **Today:** Working on bug triage, performance tuning, and unit validation.\n- **Blockers:** None currently. Ready for staging review.`;
      suggestions.push("Copy to clipboard", "Post to project feed");
    } else if (lowercaseQuery.includes("assignment")) {
      reply = `**Assignments Overview:**\n\nAssignments linked to your classes can be submitted via text explanations or GitHub repository links in the **Project Assignments** section.\n\nAlways ensure you provide public or organization-accessible repository links.`;
      suggestions.push("Open Assignments", "What class do I have today?");
    } else {
      reply = `Hello ${fullName}! I am **CodeXa AI**, your daily team workspace assistant.\n\nI can help you with:\n- **Today's Classes & Topics:** Check timings, topics, and session links\n- **Internship Profile:** Verify your domain, timeline, and mentor\n- **Assigned Projects:** Review tasks and tech stacks\n- **Daily Standup:** Draft crisp professional progress reports\n- **Leave Requests:** Guidance on HR leave submissions\n\nHow can I support your workflow today?`;
      suggestions.push(
        "What class do I have today?",
        "Show my internship details",
        "My assigned projects",
        "How to submit leave"
      );
    }

    return NextResponse.json(
      {
        ok: true,
        reply: sanitizeAiMarkdown(reply),
        suggestions,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error(`[POST /api/mobile/ai/chat] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "CodeXa AI is temporarily unavailable." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
