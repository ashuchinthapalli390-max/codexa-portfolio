/**
 * CodeXa Agency — Canonical Expertise Categories & Client-Safe Defaults
 * Ensures strict profile data isolation between Founder and all team members.
 */

export interface ExpertiseCategoryMeta {
  key: string;
  aliases: readonly string[];
  label: string;
  emptyMsg: string;
  isMono: boolean;
}

export const EXPERTISE_CATEGORIES: readonly ExpertiseCategoryMeta[] = [
  {
    key: "Development Languages",
    aliases: ["Development Languages", "languages", "Dev Languages", "Languages"],
    label: "Development Languages",
    emptyMsg: "No development languages added yet",
    isMono: true,
  },
  {
    key: "Full-Stack Engineering",
    aliases: ["Full-Stack Engineering", "Full-Stack Development", "Full Stack", "fullstack", "Full-Stack"],
    label: "Full-Stack Engineering",
    emptyMsg: "No full-stack engineering skills added yet",
    isMono: false,
  },
  {
    key: "AI Engineering",
    aliases: ["AI Engineering", "AI", "Artificial Intelligence", "AI Systems"],
    label: "AI Engineering",
    emptyMsg: "No AI engineering skills added yet",
    isMono: false,
  },
  {
    key: "Cybersecurity & Defense",
    aliases: ["Cybersecurity & Defense", "Cybersecurity", "Cyber Security", "security", "Cyber", "Cybersecurity & Ethical Hacking"],
    label: "Cybersecurity & Defense",
    emptyMsg: "No cybersecurity skills added yet",
    isMono: false,
  },
  {
    key: "Linux & Systems",
    aliases: ["Linux & Systems", "Linux", "Systems", "Linux Systems", "Linux Administration"],
    label: "Linux & Systems",
    emptyMsg: "No Linux & systems skills added yet",
    isMono: false,
  },
  {
    key: "Application Platforms",
    aliases: ["Application Platforms", "Application Engineering", "App Platforms", "Applications", "App Engineering"],
    label: "Application Platforms",
    emptyMsg: "No application platforms added yet",
    isMono: false,
  },
] as const;

/**
 * Permanent Founder Fallback Expertise.
 * ONLY allowed for the permanent Founder account (Ashu: ashuchinthapalli3900@gmail.com).
 * NEVER used for Co-Founder, CEO, CTO, COO, HR, Employees, or Interns.
 */
export const OFFICIAL_FOUNDER_EXPERTISE_DEFAULTS: Record<string, string[]> = {
  "Development Languages": ["HTML", "CSS", "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#"],
  "Full-Stack Engineering": [
    "Frontend Development",
    "Backend Development",
    "REST APIs",
    "Database Architecture",
    "Authentication Systems",
    "Admin Dashboards",
    "SaaS Platforms",
    "Developer Platforms",
    "Web Applications",
    "Responsive Applications",
    "Cloud Deployment",
    "Hosting",
    "Automation",
    "System Integration",
  ],
  "AI Engineering": [
    "AI Applications",
    "AI Agents",
    "AI Workflow Engineering",
    "LLM Integration",
    "Automation Systems",
    "Intelligent Assistants",
    "AI-Powered SaaS",
    "Prompt Engineering",
    "AI Tool Development",
  ],
  "Cybersecurity & Defense": [
    "Ethical Hacking",
    "Security Testing",
    "Secure Application Development",
    "Authentication Security",
    "Web Security",
    "Cybersecurity Tools",
    "Security Automation",
    "Linux Security",
  ],
  "Linux & Systems": [
    "Linux",
    "Linux Administration",
    "Developer Environments",
    "System Automation",
    "Command-Line Workflows",
    "Deployment Environments",
    "Server Management",
    "Security Tooling",
  ],
  "Application Platforms": [
    "Web Applications",
    "SaaS Applications",
    "Desktop Applications",
    "Android Applications",
    "iOS Applications",
    "macOS Applications",
    "Cross-Platform Applications",
    "Flutter Applications",
    "Developer Tools",
    "AI Applications",
    "Automation Applications",
  ],
};

/**
 * Resolves skills for a given category with strict data isolation.
 *
 * @param categoryKey - Canonical key of the category
 * @param aliases - Known alternative spellings/keys
 * @param expertiseGroups - User's stored expertiseGroups JSON
 * @param isFounder - Whether the profile owner is the permanent Founder
 */
export function getCategorySkills(
  categoryKey: string,
  aliases: readonly string[],
  expertiseGroups?: Record<string, any> | null,
  isFounder: boolean = false
): string[] {
  if (expertiseGroups && typeof expertiseGroups === "object") {
    // 1. Direct match
    if (Array.isArray(expertiseGroups[categoryKey]) && expertiseGroups[categoryKey].length > 0) {
      return expertiseGroups[categoryKey].map((s: any) => String(s).trim()).filter(Boolean);
    }

    // 2. Alias match
    for (const alias of aliases) {
      if (Array.isArray(expertiseGroups[alias]) && expertiseGroups[alias].length > 0) {
        return expertiseGroups[alias].map((s: any) => String(s).trim()).filter(Boolean);
      }
      const foundKey = Object.keys(expertiseGroups).find(
        (k) => k.toLowerCase().trim() === alias.toLowerCase().trim()
      );
      if (foundKey && Array.isArray(expertiseGroups[foundKey]) && expertiseGroups[foundKey].length > 0) {
        return expertiseGroups[foundKey].map((s: any) => String(s).trim()).filter(Boolean);
      }
    }
  }

  // 3. Fallback ONLY for the permanent Founder account
  if (isFounder) {
    const founderExact = OFFICIAL_FOUNDER_EXPERTISE_DEFAULTS[categoryKey];
    if (Array.isArray(founderExact) && founderExact.length > 0) {
      return founderExact;
    }
    for (const alias of aliases) {
      const founderAlias = (OFFICIAL_FOUNDER_EXPERTISE_DEFAULTS as any)[alias];
      if (Array.isArray(founderAlias) && founderAlias.length > 0) {
        return founderAlias;
      }
    }
  }

  // 4. All other users start with [] (strict isolation)
  return [];
}
