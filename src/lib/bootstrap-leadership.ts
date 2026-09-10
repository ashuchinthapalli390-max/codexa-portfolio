/**
 * CodeXa Official Leadership Identity & Initial Bootstrap System
 * Idempotently initializes real official leadership records in PostgreSQL via Prisma.
 * PRESERVES all Owner edits and never resets customized content on restart/deployment.
 */

import { db } from "./db";
import bcrypt from "bcryptjs";

export const OFFICIAL_FOUNDER_PROJECTS = [
  { name: "CodeXa IDE", category: "Developer Platform" },
  { name: "Nexa AI", category: "Artificial Intelligence" },
  { name: "EDITH AI Agent", category: "AI Agent" },
  { name: "Cyber Kivi Max", category: "Cybersecurity" },
  { name: "Vishnu Max", category: "Application" },
  { name: "CloudWave", category: "Cloud / Platform" },
  { name: "NodeWave", category: "Developer System" },
  { name: "CodeXa OS", category: "System Platform" },
];

export const OFFICIAL_FOUNDER_EXPERTISE_GROUPS = {
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
  "Cybersecurity": [
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
  "Application Engineering": [
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

export const OFFICIAL_FOUNDER_SKILLS = [
  "Full-Stack Development",
  "AI Engineering",
  "Ethical Hacking",
  "Cybersecurity",
  "Linux",
  "Flutter",
  "SaaS Architecture",
  "Python",
  "TypeScript",
  "Next.js",
  "Cloud Deployment",
  "Automation",
];

export const OFFICIAL_FOUNDER_BIO = `Ashu leads the technical direction of CodeXa Agency and works across full-stack development, artificial intelligence, cybersecurity, Linux systems, application engineering, automation and modern software architecture.

His work spans web platforms, AI agents, developer tools, SaaS products, desktop applications and cross-platform software for Android, iOS, macOS and other modern environments.

He combines frontend development, backend engineering, database systems, API development, AI integration, deployment, security practices and system-level tooling to build complete digital products rather than isolated interfaces.

He also works with Linux-based development and security environments, automation workflows, modern application architecture and cross-platform frameworks such as Flutter.`;

export const OFFICIAL_FOUNDER_SHORT_INTRO = "Ashu is the Founder and technical architect behind CodeXa Agency, building full-stack platforms, AI systems, cybersecurity tools, developer products, SaaS applications, desktop software and cross-platform applications.";

/**
 * Bootstrap Official Leadership in Database idempotently.
 * Never resets existing Owner edits.
 */
export async function bootstrapOfficialLeadership() {
  try {
    // ── 1. Founder (Ashu) ───────────────────────────────────────────────────
    let founderUser = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: "ashu", mode: "insensitive" } },
          { role: "OWNER" },
        ],
      },
    });

    if (!founderUser) {
      const defaultPw = await bcrypt.hash(process.env.OWNER_PASSWORD || "CxA!AshuFounder2026", 12);
      founderUser = await db.user.create({
        data: {
          username: "ashu",
          email: process.env.OWNER_EMAIL || "ashu@codexa.agency",
          fullName: "Ashu",
          passwordHash: defaultPw,
          role: "OWNER",
          isActive: true,
        },
      });
    }

    const founderProfile = await db.teamProfile.findUnique({
      where: { userId: founderUser.id },
    });

    if (!founderProfile) {
      // First-time initialization
      await db.teamProfile.create({
        data: {
          userId: founderUser.id,
          memberType: "LEADERSHIP",
          leadershipPosition: "FOUNDER",
          primaryRole: "Founder & Full-Stack Developer",
          displayName: "Ashu",
          headline: "Founder of CodeXa Agency • Full-Stack Developer • AI Engineer • Cybersecurity & Linux Specialist",
          publicBio: OFFICIAL_FOUNDER_SHORT_INTRO,
          bio: OFFICIAL_FOUNDER_BIO,
          featuredProjects: OFFICIAL_FOUNDER_PROJECTS,
          expertiseGroups: OFFICIAL_FOUNDER_EXPERTISE_GROUPS,
          mediaUrl: "/assets/images/founder.jpeg",
          cropX: 45,
          cropY: 22,
          cropZoom: 1.05,
          isPublic: true,
          displayOrder: 1,
        },
      });

      // Add default skills
      await db.userSkill.createMany({
        data: OFFICIAL_FOUNDER_SKILLS.map((skillName, idx) => ({
          userId: founderUser.id,
          skillName,
          displayOrder: idx,
        })),
        skipDuplicates: true,
      });
    } else {
      // Profile exists: ONLY fill missing initial structured fields without touching user-edited text
      const updateData: any = {};
      if (!founderProfile.leadershipPosition) updateData.leadershipPosition = "FOUNDER";
      if (!founderProfile.primaryRole) updateData.primaryRole = "Founder & Full-Stack Developer";
      if (!founderProfile.featuredProjects) updateData.featuredProjects = OFFICIAL_FOUNDER_PROJECTS;
      if (!founderProfile.expertiseGroups) updateData.expertiseGroups = OFFICIAL_FOUNDER_EXPERTISE_GROUPS;
      if (!founderProfile.headline) updateData.headline = "Founder of CodeXa Agency • Full-Stack Developer • AI Engineer • Cybersecurity & Linux Specialist";
      if (!founderProfile.publicBio) updateData.publicBio = OFFICIAL_FOUNDER_SHORT_INTRO;
      if (!founderProfile.bio) updateData.bio = OFFICIAL_FOUNDER_BIO;

      if (Object.keys(updateData).length > 0) {
        await db.teamProfile.update({
          where: { id: founderProfile.id },
          data: updateData,
        });
      }
    }

    // ── 2. Co-Founder (Sanjay) ─────────────────────────────────────────────
    let coFounderUser = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: "sanjay", mode: "insensitive" } },
          { profile: { leadershipPosition: "CO_FOUNDER" } },
        ],
      },
    });

    if (!coFounderUser) {
      const defaultPw = await bcrypt.hash("CxA!Sanjay2026", 12);
      coFounderUser = await db.user.create({
        data: {
          username: "sanjay",
          email: "sanjay@codexa.agency",
          fullName: "Sanjay",
          passwordHash: defaultPw,
          role: "ADMIN",
          isActive: true,
        },
      });
    }

    const coFounderProfile = await db.teamProfile.findUnique({
      where: { userId: coFounderUser.id },
    });

    if (!coFounderProfile) {
      await db.teamProfile.create({
        data: {
          userId: coFounderUser.id,
          memberType: "LEADERSHIP",
          leadershipPosition: "CO_FOUNDER",
          primaryRole: "Co-Founder & Operations Lead",
          displayName: "Sanjay",
          headline: "Co-Founder • Platform Growth & Operations",
          publicBio: "Sanjay drives operations, cross-platform product architecture, and ecosystem expansion at CodeXa Agency.",
          bio: "Sanjay coordinates operational workflows, team architecture, and client solution systems at CodeXa Agency, driving continuous technical expansion.",
          mediaUrl: "/assets/images/co-founder.jpeg",
          cropX: 50,
          cropY: 25,
          cropZoom: 1.05,
          isPublic: true,
          displayOrder: 2,
        },
      });

      await db.userSkill.createMany({
        data: [
          "Team Collaboration",
          "Community Support",
          "Project Coordination",
          "Developer Learning",
          "Technical Growth",
          "Basic Development",
        ].map((skillName, idx) => ({
          userId: coFounderUser.id,
          skillName,
          displayOrder: idx,
        })),
        skipDuplicates: true,
      });
    }

    // ── 3. CEO (Kishore) ───────────────────────────────────────────────────
    let ceoUser = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: "kishore", mode: "insensitive" } },
          { profile: { leadershipPosition: "CEO" } },
        ],
      },
    });

    if (!ceoUser) {
      const defaultPw = await bcrypt.hash("CxA!Kishore2026", 12);
      ceoUser = await db.user.create({
        data: {
          username: "kishore",
          email: "kishore@codexa.agency",
          fullName: "Kishore",
          passwordHash: defaultPw,
          role: "ADMIN",
          isActive: true,
        },
      });
    }

    const ceoProfile = await db.teamProfile.findUnique({
      where: { userId: ceoUser.id },
    });

    if (!ceoProfile) {
      await db.teamProfile.create({
        data: {
          userId: ceoUser.id,
          memberType: "LEADERSHIP",
          leadershipPosition: "CEO",
          primaryRole: "Chief Executive Officer",
          displayName: "Kishore",
          headline: "CEO • Strategic Expansion & Global Deliveries",
          publicBio: "Kishore directs executive strategy, key enterprise partnerships, and technology innovation at CodeXa Agency.",
          bio: "Kishore directs executive strategy, client engagements, and organizational scaling at CodeXa Agency. Combining business acumen with continuous technical expansion, he oversees product delivery and platform growth.",
          mediaUrl: "/assets/images/ceo.jpeg",
          cropX: 50,
          cropY: 20,
          cropZoom: 1.05,
          isPublic: true,
          displayOrder: 3,
        },
      });

      await db.userSkill.createMany({
        data: [
          "Business Strategy",
          "Project Direction",
          "Client Operations",
          "Team Leadership",
          "Product Planning",
          "Technology Strategy",
          "Execution Tracking",
        ].map((skillName, idx) => ({
          userId: ceoUser.id,
          skillName,
          displayOrder: idx,
        })),
        skipDuplicates: true,
      });
    }

    // ── 4. Team Lead ────────────────────────────────────────────────────────
    let teamLeadUser = await db.user.findFirst({
      where: {
        OR: [
          { username: { equals: "teamlead", mode: "insensitive" } },
          { profile: { leadershipPosition: "TEAM_LEAD" } },
        ],
      },
    });

    if (!teamLeadUser) {
      const defaultPw = await bcrypt.hash("CxA!Lead2026", 12);
      teamLeadUser = await db.user.create({
        data: {
          username: "teamlead",
          email: "lead@codexa.agency",
          fullName: "Team Lead",
          passwordHash: defaultPw,
          role: "TEAM_MEMBER",
          isActive: true,
        },
      });
    }

    const teamLeadProfile = await db.teamProfile.findUnique({
      where: { userId: teamLeadUser.id },
    });

    if (!teamLeadProfile) {
      await db.teamProfile.create({
        data: {
          userId: teamLeadUser.id,
          memberType: "LEADERSHIP",
          leadershipPosition: "TEAM_LEAD",
          primaryRole: "Team Lead & Coordination Expert",
          displayName: "Team Lead",
          headline: "Team Lead • Coordination • Execution",
          publicBio: "The Team Lead manages day-to-day coordination between CodeXa members, tracks team execution, helps organize project responsibilities and supports smooth communication between leadership and developers.",
          bio: "Overseeing day-to-day sprint tracking and developer collaboration, the Team Lead ensures seamless execution across all client and internal platform builds.",
          mediaUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
          isPublic: true,
          displayOrder: 4,
        },
      });

      await db.userSkill.createMany({
        data: [
          "Team Coordination",
          "Task Management",
          "Member Coordination",
          "Communication",
          "Project Follow-Up",
          "Execution Tracking",
          "Meeting Coordination",
          "Developer Collaboration",
        ].map((skillName, idx) => ({
          userId: teamLeadUser.id,
          skillName,
          displayOrder: idx,
        })),
        skipDuplicates: true,
      });
    }

    return true;
  } catch (error) {
    console.error("[BOOTSTRAP LEADERSHIP ERROR]:", error);
    return false;
  }
}
