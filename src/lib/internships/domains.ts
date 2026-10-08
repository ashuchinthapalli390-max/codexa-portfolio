/**
 * CodeXa Agency — Canonical Internship Domain & Workforce Catalog
 * Single Source of Truth across the entire platform.
 */

export interface InternshipDomainConfig {
  key: string;
  label: string;
  durationMonths: 2 | 3 | 6 | 9;
  durationLabel: string;
  baseDurationMonths?: number;
  extendedDurationMonths?: number;
  canExtend?: boolean;
  isActive: boolean;
  aliases: string[];
}

export type WorkforceCategory = "LEARNING_INTERN" | "INTERN" | "EMPLOYEE";

export interface WorkforceRoleOption {
  value: WorkforceCategory;
  label: string;
  orgRole: "INTERN" | "EMPLOYEE";
  description: string;
}

export const CANONICAL_WORKFORCE_ROLES: WorkforceRoleOption[] = [
  {
    value: "LEARNING_INTERN",
    label: "Learning Intern",
    orgRole: "INTERN",
    description: "Intern enrolled in academic/training track.",
  },
  {
    value: "INTERN",
    label: "Intern",
    orgRole: "INTERN",
    description: "Standard active operational intern.",
  },
  {
    value: "EMPLOYEE",
    label: "Employee",
    orgRole: "EMPLOYEE",
    description: "Core full-time or contract employee.",
  },
];

export const INTERNSHIP_DOMAINS: InternshipDomainConfig[] = [
  // ─── 2 MONTHS DOMAINS ────────────────────────────────────────────────────────
  {
    key: "automations",
    label: "Automations",
    durationMonths: 2,
    durationLabel: "2 Months",
    isActive: true,
    aliases: [
      "automations",
      "automation",
      "ai automations",
      "process automation",
      "workflow automation",
    ],
  },
  {
    key: "cybersecurity-2m",
    label: "Cybersecurity",
    durationMonths: 2,
    durationLabel: "2 Months",
    isActive: true,
    aliases: [
      "cybersecurity",
      "cyber security",
      "cyber",
      "cybersecurity track",
    ],
  },

  // ─── 3 MONTHS DOMAINS ────────────────────────────────────────────────────────
  {
    key: "fsd-ai",
    label: "Full-Stack Development with AI",
    durationMonths: 3,
    durationLabel: "3 Months",
    baseDurationMonths: 3,
    extendedDurationMonths: 4,
    canExtend: true,
    isActive: true,
    aliases: [
      "full-stack development with ai",
      "full stack development with ai",
      "fsd with ai",
      "fsd-ai",
      "full-stack development",
      "full stack development",
      "development",
      "full stack developer with ai",
    ],
  },
  {
    key: "ui-ux-design",
    label: "UI/UX Design",
    durationMonths: 3,
    durationLabel: "3 Months",
    isActive: true,
    aliases: [
      "ui/ux design",
      "ui/ux",
      "ui ux",
      "ui ux design",
      "product design",
      "design",
    ],
  },
  {
    key: "custom-software-dev",
    label: "Custom Software Development",
    durationMonths: 3,
    durationLabel: "3 Months",
    isActive: true,
    aliases: [
      "custom software development",
      "custom software dev",
      "software development",
      "software engineering",
    ],
  },
  {
    key: "app-dev",
    label: "Application Development",
    durationMonths: 3,
    durationLabel: "3 Months",
    isActive: true,
    aliases: [
      "application development",
      "app development",
      "application dev",
    ],
  },
  {
    key: "mobile-app-dev",
    label: "Mobile App Development",
    durationMonths: 3,
    durationLabel: "3 Months",
    isActive: true,
    aliases: [
      "mobile app development",
      "mobile application development",
      "mobile app dev",
      "android development",
      "ios development",
      "flutter",
      "react native",
    ],
  },
  {
    key: "gen-ai-agents",
    label: "Generative AI & AI Agents",
    durationMonths: 3,
    durationLabel: "3 Months",
    isActive: true,
    aliases: [
      "generative ai & ai agents",
      "generative ai and ai agents",
      "genrative ai , ai agents",
      "genrative ai, ai agents",
      "generative ai",
      "ai agents",
      "gen ai",
      "genai & agents",
    ],
  },

  // ─── 6 MONTHS DOMAINS ────────────────────────────────────────────────────────
  {
    key: "web-dev",
    label: "Web Development",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "web development",
      "web dev",
      "frontend development",
      "backend development",
    ],
  },
  {
    key: "prog-fs-java",
    label: "Programming Full Stack — Java",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "programming full stack — java",
      "programming full stack - java",
      "java full stack",
      "java full-stack",
      "programming full stack java",
      "full stack java",
      "java",
    ],
  },
  {
    key: "prog-fs-python",
    label: "Programming Full Stack — Python",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "programming full stack — python",
      "programming full stack - python",
      "python full stack",
      "python full-stack",
      "programming full stack python",
      "full stack python",
      "python",
    ],
  },
  {
    key: "ai-ml-6m",
    label: "AI & Machine Learning",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "ai & machine learning",
      "ai / machine learning",
      "ai and machine learning",
      "ai & ml",
      "ai/ml",
      "machine learning",
      "artificial intelligence",
    ],
  },
  {
    key: "cloud-devops",
    label: "Cloud & DevOps",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "cloud & devops",
      "cloud and devops",
      "cloud computing & devops",
      "cloud computing and devops",
      "devops",
      "cloud",
    ],
  },
  {
    key: "ethical-hacking",
    label: "Ethical Hacking",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "ethical hacking",
      "ethical hacker",
      "white hat",
    ],
  },
  {
    key: "pentesting-vapt",
    label: "Penetration Testing / Bug Bounty / VAPT",
    durationMonths: 6,
    durationLabel: "6 Months",
    isActive: true,
    aliases: [
      "penetration testing / bug bounty / vapt",
      "penetration testing / vapt",
      "pentesting / bug / vapt",
      "pentesting",
      "penetration testing",
      "bug bounty",
      "vapt",
    ],
  },

  // ─── 9 MONTHS DOMAINS ────────────────────────────────────────────────────────
  {
    key: "cyber-ethical-pentest-9m",
    label: "Cybersecurity — Ethical Hacking + Penetration Testing",
    durationMonths: 9,
    durationLabel: "9 Months",
    isActive: true,
    aliases: [
      "cybersecurity — ethical hacking + penetration testing",
      "cybersecurity - ethical hacking + penetration testing",
      "cybersecurity, ethical hacking & vapt",
      "cybersecurity, ethical hacking and vapt",
      "cyber (ethical + pentesting)",
      "cybersecurity ethical hacking pentesting",
      "cyber 9 months",
    ],
  },
  {
    key: "aiml-genai-agents-9m",
    label: "AI & Machine Learning + Generative AI & AI Agents",
    durationMonths: 9,
    durationLabel: "9 Months",
    isActive: true,
    aliases: [
      "ai & machine learning + generative ai & ai agents",
      "ai and machine learning + generative ai and ai agents",
      "ai & ml, generative ai & ai agents",
      "ai & ml, generative ai and ai agents",
      "ai ml, generative ai & ai agents",
      "ai ml, generative ai and ai agents",
      "aiml + genai",
    ],
  },
];

/**
 * Normalizes any legacy or free-text domain into its canonical label.
 * If unrecognized, returns null or fallback.
 */
export function normalizeDomain(rawDomain?: string | null): string {
  if (!rawDomain) return "Full-Stack Development with AI";
  const cleaned = rawDomain.trim().toLowerCase();

  for (const domain of INTERNSHIP_DOMAINS) {
    if (domain.label.toLowerCase() === cleaned) {
      return domain.label;
    }
    if (domain.aliases.some((alias) => alias.toLowerCase() === cleaned)) {
      return domain.label;
    }
  }

  // Partial / Fuzzy match fallback for known fragments
  if (cleaned.includes("fsd") || cleaned.includes("full-stack") || cleaned.includes("full stack")) {
    if (cleaned.includes("python")) return "Programming Full Stack — Python";
    if (cleaned.includes("java")) return "Programming Full Stack — Java";
    return "Full-Stack Development with AI";
  }
  if (cleaned.includes("cyber") && (cleaned.includes("ethical") || cleaned.includes("vapt") || cleaned.includes("pentest"))) {
    return "Cybersecurity — Ethical Hacking + Penetration Testing";
  }
  if (cleaned.includes("cyber")) {
    return "Cybersecurity";
  }
  if (cleaned.includes("ethical") && cleaned.includes("hack")) {
    return "Ethical Hacking";
  }
  if (cleaned.includes("pentest") || cleaned.includes("vapt") || cleaned.includes("bug bounty")) {
    return "Penetration Testing / Bug Bounty / VAPT";
  }
  if (cleaned.includes("machine learning") && cleaned.includes("generative")) {
    return "AI & Machine Learning + Generative AI & AI Agents";
  }
  if (cleaned.includes("machine learning") || cleaned.includes("ai & ml") || cleaned.includes("ai/ml")) {
    return "AI & Machine Learning";
  }
  if (cleaned.includes("gen") && cleaned.includes("agent")) {
    return "Generative AI & AI Agents";
  }
  if (cleaned.includes("automation")) {
    return "Automations";
  }
  if (cleaned.includes("cloud") || cleaned.includes("devops")) {
    return "Cloud & DevOps";
  }
  if (cleaned.includes("ui") || cleaned.includes("ux")) {
    return "UI/UX Design";
  }
  if (cleaned.includes("mobile")) {
    return "Mobile App Development";
  }
  if (cleaned.includes("web dev") || cleaned.includes("web development")) {
    return "Web Development";
  }

  // Preserve as is if unable to map
  return rawDomain.trim();
}

/**
 * Returns duration in months for a given canonical or legacy domain.
 */
export function getDomainDurationMonths(domainOrRaw?: string | null): number {
  const canonical = normalizeDomain(domainOrRaw);
  const found = INTERNSHIP_DOMAINS.find(
    (d) => d.label.toLowerCase() === canonical.toLowerCase()
  );
  return found ? found.durationMonths : 3;
}

/**
 * Returns formatted duration label (e.g. "3 Months")
 */
export function getDomainDurationLabel(domainOrRaw?: string | null): string {
  const months = getDomainDurationMonths(domainOrRaw);
  return `${months} Months`;
}

/**
 * Get domain configurations filtered by duration.
 */
export function getDomainsByDuration(months: 2 | 3 | 6 | 9): InternshipDomainConfig[] {
  return INTERNSHIP_DOMAINS.filter((d) => d.durationMonths === months);
}

/**
 * Checks if a domain string matches an official canonical domain label.
 */
export function isCanonicalDomain(domainName: string): boolean {
  return INTERNSHIP_DOMAINS.some(
    (d) => d.label.toLowerCase() === domainName.trim().toLowerCase()
  );
}

/**
 * Safe workforce role helper.
 * Never converts Executive roles (FOUNDER, CO_FOUNDER, CEO, CTO, HR, COO).
 */
export function getWorkforceDisplayLabel(role?: string | null, workforceType?: string | null): string {
  // If user is executive, preserve official RBAC title
  if (role === "FOUNDER" || role === "OWNER") return "Founder";
  if (role === "CO_FOUNDER") return "Co-Founder";
  if (role === "CEO") return "CEO";
  if (role === "CTO") return "CTO";
  if (role === "HR") return "HR";
  if (role === "COO") return "COO";

  // Workforce type mapping
  if (workforceType === "LEARNING_INTERN") return "Learning Intern";
  if (workforceType === "INTERN" || role === "INTERN") return "Intern";
  if (workforceType === "EMPLOYEE" || role === "EMPLOYEE") return "Employee";

  return role || "Member";
}
