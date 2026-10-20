import { db } from "@/lib/db";
import { getEffectiveRole, hasPermission, Permission, UserPermissionContext } from "@/lib/permissions";

export interface ResolvedClassDTO {
  id: string;
  sourceKey: string | null;
  sequenceNumber: number | null;
  title: string;
  classType: string;
  domain: string;
  domains: Array<{ id: string; code: string; name: string; displayName: string }>;
  batch: string;
  topic: string;
  subtopics: string[];
  instructorId: string | null;
  instructorName: string;
  classDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  duration: string;
  timeZone: string;
  mode: "ONLINE" | "OFFLINE" | "HYBRID" | string;
  meetingLink: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
  lifecycleStatus: "UPCOMING" | "LIVE" | "COMPLETED" | "RESCHEDULED" | "CANCELLED";
  status: string; // for backward compatibility
  learningObjectives: string | null;
  resources: any[];
  assignments: any[];
  revision: number;
  canManage: boolean;
  learningGoals?: any[];
  trainerDemo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResolveClassesOptions {
  user: UserPermissionContext & { id: string };
  date?: string | null; // YYYY-MM-DD
  month?: string | null; // YYYY-MM
  domain?: string | null;
  batch?: string | null;
  includeDrafts?: boolean;
}

export interface ScheduledDatesSummary {
  date: string;
  count: number;
  hasLive: boolean;
  hasUpcoming: boolean;
}

const DOMAIN_CODE_TO_PATTERNS: Record<string, string[]> = {
  FS_AI: ["full-stack development with ai", "fs_ai", "vibe", "full stack", "fullstack"],
  PY: ["python", "programming full stack - python", "programming full stack — python"],
  AIML: ["ai & machine learning", "aiml", "machine learning", "artificial intelligence"],
  CY2: ["cybersecurity", "cy2", "cyber security"],
  PENTEST: ["penetration testing", "ethical hacking + penetration testing", "pentest"],
  AI9: ["generative ai & ai agents", "ai & machine learning + generative ai & ai agents", "ai9", "gen ai", "genai"],
  ETH: ["ethical hacking", "eth"],
  AG3: ["generative ai & ai agents", "ag3", "ai agents"],
  MOBILE: ["mobile app development", "mobile", "flutter", "android"],
  JAVA: ["java", "programming full stack - java", "programming full stack — java"],
  UIUX: ["ui/ux design", "uiux", "ui/ux", "product design"],
  WEB: ["web development", "web", "frontend"],
};

export function parseYearOfStudy(val?: string | null): number | null {
  if (!val) return null;
  const match = val.match(/\b([1-4])(?:st|nd|rd|th)?(?:\s*year)?\b/i);
  if (match) return parseInt(match[1], 10);
  const digitMatch = val.match(/[1-4]/);
  return digitMatch ? parseInt(digitMatch[0], 10) : null;
}

export function extractTargetYears(attendingDomains: any[]): number[] {
  const years: number[] = [];
  if (!Array.isArray(attendingDomains)) return years;
  for (const item of attendingDomains) {
    if (typeof item !== "string") continue;
    const lower = item.toLowerCase().trim();
    if (lower === "all_years" || lower === "all-years" || lower === "all") {
      return [1, 2, 3, 4];
    }
    const match = lower.match(/\b(?:year[_-]?|y)([1-4])\b/i) || lower.match(/\b([1-4])(?:st|nd|rd|th)?\s*year\b/i);
    if (match) {
      const y = parseInt(match[1], 10);
      if (!years.includes(y)) years.push(y);
    }
  }
  return years;
}

function matchesDomainPatterns(userDomainStr: string, attendingDomainCodes: string[]): boolean {
  if (!userDomainStr) return false;
  const lower = userDomainStr.toLowerCase().trim();
  for (const code of attendingDomainCodes) {
    if (typeof code !== "string") continue;
    const codeUpper = code.toUpperCase().trim();
    if (codeUpper === "ALL" || codeUpper === "ALL DOMAINS" || codeUpper === "ALL_DOMAINS") {
      return true;
    }
    const patterns = DOMAIN_CODE_TO_PATTERNS[codeUpper] || [code.toLowerCase()];
    if (patterns.some((p) => lower.includes(p.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

export function determineClassType(c: { title: string; mode: string }): string {
  const titleLower = c.title.toLowerCase();
  if (titleLower.includes("workshop")) return "WORKSHOP";
  if (titleLower.includes("mentor") || titleLower.includes("doubt")) return "MENTOR_SESSION";
  if (titleLower.includes("assessment") || titleLower.includes("exam") || titleLower.includes("test")) return "ASSESSMENT";
  if (titleLower.includes("meeting") || titleLower.includes("sync")) return "ONLINE_MEETING";
  if (c.mode === "OFFLINE") return "OFFLINE_CLASS";
  return "LIVE_CLASS";
}

export function computePublicationStatus(c: { publishedAt: Date | null; status: string }): "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED" {
  if (c.status === "DRAFT") return "DRAFT";
  if (c.status === "ARCHIVED" || c.status === "SUPERSEDED_LEGACY_DRAFT") return "ARCHIVED";
  if (!c.publishedAt) return "UNPUBLISHED";
  return "PUBLISHED";
}

export function computeLifecycleStatus(c: { status: string; classDate: Date; startTime: string; endTime: string; timeZone?: string | null }): "UPCOMING" | "LIVE" | "COMPLETED" | "RESCHEDULED" | "CANCELLED" {
  if (c.status === "CANCELLED") return "CANCELLED";
  if (c.status === "RESCHEDULED") return "RESCHEDULED";
  if (c.status === "COMPLETED") return "COMPLETED";
  if (c.status === "LIVE") return "LIVE";

  // Check real-time clock window if today
  try {
    const classDateStr = c.classDate.toISOString().split("T")[0];
    const now = new Date();
    // Use Asia/Kolkata timezone offset (+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const todayIST = nowIST.toISOString().split("T")[0];

    if (classDateStr === todayIST && c.startTime && c.endTime) {
      const [startH, startM] = c.startTime.split(":").map((v) => parseInt(v, 10));
      const [endH, endM] = c.endTime.split(":").map((v) => parseInt(v, 10));
      const nowH = nowIST.getHours();
      const nowM = nowIST.getMinutes();
      const nowMins = nowH * 60 + nowM;
      const startMins = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
      const endMins = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);

      if (nowMins >= startMins && nowMins <= endMins) {
        return "LIVE";
      }
      if (nowMins > endMins) {
        return "COMPLETED";
      }
    }
  } catch (_) {}

  return "UPCOMING";
}

/**
 * Resolves all authorized, canonical classes for a user based on RBAC, publication state,
 * domain link/codes, batch, academic year, and date/month parameters.
 */
export async function resolveVisibleClassesForUser(options: ResolveClassesOptions): Promise<{
  classes: ResolvedClassDTO[];
  canManageClasses: boolean;
  userRole: string;
  userDomain: string | null;
  userDomainId: string | null;
  userYear: number | null;
}> {
  const { user, date, month, domain, batch, includeDrafts } = options;

  const role = getEffectiveRole(user);
  const canManageClasses = hasPermission(user, Permission.CAN_EDIT_CLASSES) ||
    hasPermission(user, Permission.CAN_CREATE_CLASSES) ||
    hasPermission(user, Permission.CAN_VIEW_DRAFT_CLASSES);

  // Fetch full user employment profile for audience matching
  const userRecord = await db.user.findUnique({
    where: { id: user.id },
    include: {
      employmentProfile: {
        include: {
          trainingDomain: true,
        },
      },
    },
  });

  const emp = userRecord?.employmentProfile;
  const userDomain = emp?.internshipDomain || emp?.trainingDomain?.name || userRecord?.department || null;
  const userDomainId = emp?.domainId || null;
  const userDomainCode = emp?.trainingDomain?.code || null;
  const userYear = parseYearOfStudy(emp?.yearOfStudy);

  // Build Prisma where clause
  const whereClause: any = {
    status: { not: "SUPERSEDED_LEGACY_DRAFT" },
  };

  // Published vs Draft security:
  // If user lacks CAN_VIEW_DRAFT_CLASSES, they NEVER receive drafts or unpublished classes.
  if (!canManageClasses || !includeDrafts) {
    whereClause.status = { in: ["UPCOMING", "LIVE", "COMPLETED", "RESCHEDULED", "CANCELLED"] };
    whereClause.publishedAt = { not: null };
  }

  // Exact date filtering
  if (date) {
    whereClause.classDate = new Date(date + "T00:00:00.000Z");
  }

  const rawClasses = await db.scheduledClass.findMany({
    where: whereClause,
    orderBy: [{ classDate: "asc" }, { startTime: "asc" }],
    include: {
      domainLinks: {
        select: {
          domainId: true,
          domain: {
            select: {
              id: true,
              code: true,
              name: true,
              displayName: true,
            },
          },
        },
      },
      assignments: {
        where: canManageClasses ? undefined : { status: { in: ["PUBLISHED", "ACTIVE"] } },
        select: {
          id: true,
          sourceKey: true,
          title: true,
          status: true,
          submissionType: true,
          releaseAt: true,
          dueDate: true,
          evidenceRequired: true,
        },
      },
    },
  });

  // Audience Filtering Logic
  let filtered = rawClasses;

  if (!canManageClasses) {
    // Ordinary users see only classes for their audience
    filtered = filtered.filter((c) => {
      // 1. Common / All Domains check:
      // If class explicitly says "All Domains" in domain column, or attendingDomains has "ALL" or "ALL_DOMAINS"
      const attendingCodes: string[] = Array.isArray(c.attendingDomains)
        ? (c.attendingDomains as string[])
        : [];

      const isExplicitAllDomains =
        c.domain === "All Domains" ||
        attendingCodes.some((code) => typeof code === "string" && ["ALL", "ALL_DOMAINS", "ALL DOMAINS"].includes(code.toUpperCase().trim()));

      // 2. Specific individual target:
      if (attendingCodes.includes(user.id)) return true;

      // 3. Academic Year check:
      const targetYears = extractTargetYears(attendingCodes);
      if (targetYears.length > 0 && userYear !== null) {
        if (!targetYears.includes(userYear)) {
          // Excluded: class targets specific year that doesn't match this student
          return false;
        }
      }

      // 4. If common to all domains (and year matched if year was specified)
      if (isExplicitAllDomains) return true;

      // 5. Domain ID match via ClassDomainLink
      if (userDomainId && c.domainLinks?.some((l) => l.domainId === userDomainId)) {
        return true;
      }

      // 6. Domain Code match
      if (userDomainCode && attendingCodes.some((code) => code.toUpperCase() === userDomainCode.toUpperCase())) {
        return true;
      }

      // 7. Domain name pattern match
      if (userDomain && matchesDomainPatterns(userDomain, attendingCodes)) {
        return true;
      }

      // 8. If domain text matches user department/domain
      if (userDomain && c.domain.toLowerCase().includes(userDomain.toLowerCase())) {
        return true;
      }

      return false;
    });
  } else if (domain && domain !== "ALL" && domain !== "All Domains") {
    // Admin explicit domain filter in query
    filtered = filtered.filter((c) => {
      if (c.domain === "All Domains") return true;
      if (c.domainLinks?.some((l) => l.domainId === domain || l.domain.code === domain || l.domain.name.toLowerCase() === domain.toLowerCase())) {
        return true;
      }
      const attendingCodes = Array.isArray(c.attendingDomains) ? (c.attendingDomains as string[]) : [];
      if (attendingCodes.some((code) => code.toLowerCase() === domain.toLowerCase())) return true;
      return c.domain.toLowerCase().includes(domain.toLowerCase());
    });
  }

  // Month filtering if specified (YYYY-MM)
  if (month) {
    filtered = filtered.filter((c) => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr.startsWith(month);
    });
  }

  // Format into canonical DTO
  const formattedClasses: ResolvedClassDTO[] = filtered.map((c) => {
    const classDateStr = c.classDate.toISOString().split("T")[0];
    const publicationStatus = computePublicationStatus(c);
    const lifecycleStatus = computeLifecycleStatus(c);
    const classType = determineClassType(c);

    let parsedSubtopics: string[] = [];
    if (Array.isArray(c.subtopics)) {
      parsedSubtopics = c.subtopics as string[];
    } else if (typeof c.subtopics === "string") {
      try {
        parsedSubtopics = JSON.parse(c.subtopics);
      } catch (_) {}
    }

    let parsedResources: any[] = [];
    if (Array.isArray(c.resources)) {
      parsedResources = c.resources as any[];
    } else if (typeof c.resources === "string") {
      try {
        parsedResources = JSON.parse(c.resources);
      } catch (_) {}
    }

    // Meeting link: Only show to authorized users if online/hybrid
    let meetingLink = c.meetingLink;
    if (c.mode === "OFFLINE" || lifecycleStatus === "CANCELLED") {
      meetingLink = null;
    }

    // Calculate revision from updatedAt
    const revision = c.updatedAt ? Math.floor(new Date(c.updatedAt).getTime() / 1000) : 1;

    return {
      id: c.id,
      sourceKey: c.sourceKey,
      sequenceNumber: c.sequenceNumber,
      title: c.title,
      classType,
      domain: c.domain,
      domains: c.domainLinks.map((l) => l.domain),
      batch: c.batch,
      topic: c.topic,
      subtopics: parsedSubtopics,
      instructorId: c.instructorId,
      instructorName: c.instructorName,
      classDate: classDateStr,
      startTime: c.startTime,
      endTime: c.endTime,
      duration: c.duration,
      timeZone: c.timeZone || "Asia/Kolkata",
      mode: c.mode,
      meetingLink,
      publicationStatus,
      lifecycleStatus,
      status: c.status,
      learningObjectives: c.learningObjectives,
      resources: parsedResources,
      assignments: c.assignments || [],
      revision,
      canManage: canManageClasses,
      learningGoals: Array.isArray(c.learningGoals) ? (c.learningGoals as any[]) : [],
      trainerDemo: c.trainerDemo,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  return {
    classes: formattedClasses,
    canManageClasses,
    userRole: role,
    userDomain,
    userDomainId,
    userYear,
  };
}
