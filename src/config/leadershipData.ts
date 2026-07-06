/**
 * LOCKED Leadership Configuration — CodeXa Agency
 *
 * ╔══════════════════════════════════════════════════════╗
 * ║  THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR ALL    ║
 * ║  FOUNDER, CO-FOUNDER, AND CEO WRITTEN CONTENT.      ║
 * ║                                                      ║
 * ║  NONE of these fields are editable via any           ║
 * ║  dashboard, API, form, or hidden request.            ║
 * ║                                                      ║
 * ║  SQLite stores ONLY: mediaUrl, mediaMimeType,        ║
 * ║  updatedAt — never text content.                     ║
 * ╚══════════════════════════════════════════════════════╝
 */

/** A named skill chip */
export interface SkillEntry {
  label: string;
}

/** A project card */
export interface ProjectEntry {
  name: string;
  description: string;
}

/** A section block shown in the modal */
export interface ModalSection {
  title: string;
  type: "projects" | "skills" | "bullets";
  projects?: ProjectEntry[];
  skills?: string[];
  bullets?: string[];
}

export interface LeadershipMember {
  leadershipPosition: "FOUNDER" | "CO_FOUNDER" | "CEO";
  name: string;
  role: string;
  /** Short tagline shown on the card */
  tagline: string;
  /** Full description shown in modal */
  description: string;
  /** Ordered sections shown in the modal */
  modalSections: ModalSection[];
  quote: string;
  /** Fallback image path when no media is uploaded */
  defaultImage: string;
  /** Preview skills shown on the card face (first N chips) */
  cardSkillPreview: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FOUNDER — ASHU (LOCKED)
// ─────────────────────────────────────────────────────────────────────────────
const FOUNDER: LeadershipMember = {
  leadershipPosition: "FOUNDER",
  name: "Ashu",
  role: "Founder, Full-Stack Developer & AI Workflow Engineer",
  tagline: "Founder & Full-Stack Developer",
  description:
    "Ashu is the technical force behind CodeXa Agency, focused on turning ambitious ideas into polished, scalable, secure digital products. From interactive 3D websites and custom platforms to AI-powered workflows and deployment systems, he leads the architecture, development, and creative technology direction of CodeXa.\n\nHe combines modern frontend design with practical backend systems, automation, cloud deployment, and developer-focused tools. His goal is not only to make websites look premium, but to build complete digital experiences that are fast, functional, secure, and ready to grow.",
  modalSections: [
    {
      title: "Projects & Creations",
      type: "projects",
      projects: [
        {
          name: "Creator of EDITH AI Agent",
          description:
            "An AI-focused assistant/workflow concept built to support smarter productivity, automation, and development tasks.",
        },
        {
          name: "Creator of CODEXA IDE",
          description:
            "A developer-focused coding workspace concept designed around modern development, project previews, and AI-assisted workflows.",
        },
        {
          name: "CodeXa Agency Platform",
          description:
            "Building a premium agency ecosystem for web development, AI systems, cybersecurity awareness, automation, hosting, and developer growth.",
        },
      ],
    },
    {
      title: "Technical Expertise",
      type: "skills",
      skills: [
        "Full-Stack Web Development",
        "AI-Assisted Development",
        "AI Workflow Design",
        "Modern Frontend Architecture",
        "Responsive Website Development",
        "3D and Cinematic Website Experiences",
        "Dashboard and Portal Development",
        "Secure Authentication Flows",
        "Database Integration",
        "API Development",
        "Automation Systems",
        "Hosting & Deployment",
        "Cloud-Based Project Setup",
        "Website Performance Optimization",
        "Developer Tool Creation",
        "Discord System Development",
        "Cybersecurity Awareness",
        "Digital Product Strategy",
      ],
    },
    {
      title: "Leadership & Vision",
      type: "bullets",
      bullets: [
        "Leads CodeXa's technology and product direction",
        "Converts creative ideas into working systems",
        "Builds developer-friendly workflows and tools",
        "Focuses on scalable, secure, premium digital experiences",
        "Helps aspiring developers learn through real projects",
        "Builds communities around learning, collaboration, and innovation",
      ],
    },
  ],
  quote: "I don't just write code. I engineer digital futures.",
  defaultImage: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
  cardSkillPreview: ["AI Workflow Engineer", "Full-Stack Dev", "3D Websites"],
};

// ─────────────────────────────────────────────────────────────────────────────
// CO-FOUNDER — DEEPAK (LOCKED)
// ─────────────────────────────────────────────────────────────────────────────
const CO_FOUNDER: LeadershipMember = {
  leadershipPosition: "CO_FOUNDER",
  name: "Deepak",
  role: "Communication & Community Lead",
  tagline: "Co-Founder & Community Lead",
  description:
    "Deepak manages the people side of CodeXa. He helps keep the team organized, supports students and applicants, coordinates internship communication, and builds a welcoming developer community.",
  modalSections: [
    {
      title: "Community & Operations",
      type: "skills",
      skills: [
        "Team Coordination",
        "Student Support",
        "Internship Management",
        "Community Building",
        "Application Review",
        "Developer Communication",
        "Member Engagement",
        "Internal Collaboration",
        "Feedback Collection",
        "New Member Guidance",
        "Team Updates and Coordination",
      ],
    },
  ],
  quote: "Helping every developer grow together.",
  defaultImage: "/assets/images/2299fdd2a1d01339a71af61a2c7e9cac.jpg",
  cardSkillPreview: ["Team Coordination", "Community Building", "Internship Mgmt"],
};

// ─────────────────────────────────────────────────────────────────────────────
// CEO — VENU (LOCKED)
// ─────────────────────────────────────────────────────────────────────────────
const CEO: LeadershipMember = {
  leadershipPosition: "CEO",
  name: "Venu",
  role: "CEO & Strategy Lead",
  tagline: "CEO & Strategy Lead",
  description:
    "Venu drives CodeXa's business direction, client coordination, partnerships, growth planning, and long-term agency expansion. He focuses on turning the team's technical strengths into clear execution and sustainable growth.",
  modalSections: [
    {
      title: "Leadership & Growth",
      type: "skills",
      skills: [
        "Client Operations",
        "Business Strategy",
        "Growth Planning",
        "Agency Expansion",
        "Partnerships",
        "Project Direction",
        "Client Communication",
        "Team Leadership",
        "Opportunity Planning",
        "Service Strategy",
        "Brand Direction",
        "Operational Decisions",
      ],
    },
  ],
  quote: "Vision creates companies. Execution builds them.",
  defaultImage: "/assets/images/2306fc1d8f6ea04d1ddd4ebfafd003f2.jpg",
  cardSkillPreview: ["Business Strategy", "Agency Growth", "Client Operations"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const LEADERSHIP_DATA: Record<"FOUNDER" | "CO_FOUNDER" | "CEO", LeadershipMember> = {
  FOUNDER,
  CO_FOUNDER,
  CEO,
};

/** Ordered list for consistent rendering (Founder → Co-Founder → CEO) */
export const LEADERSHIP_ORDER: Array<"FOUNDER" | "CO_FOUNDER" | "CEO"> = [
  "FOUNDER",
  "CO_FOUNDER",
  "CEO",
];

export function getLeadershipData(position: string): LeadershipMember | undefined {
  return LEADERSHIP_DATA[position as keyof typeof LEADERSHIP_DATA];
}
