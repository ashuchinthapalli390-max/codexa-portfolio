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
  quote: "Vision creates companies. Execution builds them.",
  defaultImage: "/assets/images/founder.jpeg",
  cardSkillPreview: ["AI Workflow Engineer", "Full-Stack Dev", "Cloud Architect"],
};

// ─────────────────────────────────────────────────────────────────────────────
// CO-FOUNDER — SANJAY (LOCKED)
// ─────────────────────────────────────────────────────────────────────────────
const CO_FOUNDER: LeadershipMember = {
  leadershipPosition: "CO_FOUNDER",
  name: "Sanjay",
  role: "Co-Founder & Operations Lead",
  tagline: "Co-Founder & Operations Lead",
  description:
    "Sanjay drives operations, cross-platform product architecture, and ecosystem expansion at CodeXa Agency, ensuring smooth coordination across engineering and clients.",
  modalSections: [
    {
      title: "Operations & Platform Growth",
      type: "skills",
      skills: [
        "Platform Architecture",
        "Operations Leadership",
        "Team Coordination",
        "Product Scaling",
        "Ecosystem Growth",
        "Client Solutions",
        "Engineering Management",
        "Workflow Automation",
        "Developer Community",
        "Quality Assurance",
        "Cross-Platform Systems",
      ],
    },
  ],
  quote: "Precision execution turns bold ideas into reality.",
  defaultImage: "/assets/images/co-founder.jpeg",
  cardSkillPreview: ["Platform Architecture", "Operations", "Team Leadership"],
};

// ─────────────────────────────────────────────────────────────────────────────
// CEO — KISHORE (LOCKED)
// ─────────────────────────────────────────────────────────────────────────────
const CEO: LeadershipMember = {
  leadershipPosition: "CEO",
  name: "Kishore",
  role: "CEO & Executive Strategy",
  tagline: "CEO & Executive Strategy",
  description:
    "Kishore directs executive strategy, key enterprise partnerships, and technology innovation at CodeXa Agency, scaling client deliveries globally.",
  modalSections: [
    {
      title: "Executive Strategy & Enterprise Delivery",
      type: "skills",
      skills: [
        "Executive Strategy",
        "Enterprise Delivery",
        "Business Growth",
        "Technology Innovation",
        "Global Client Operations",
        "Strategic Partnerships",
        "Engineering Leadership",
        "Product Direction",
        "Brand Strategy",
        "Resource Optimization",
        "Scalable Infrastructure",
      ],
    },
  ],
  quote: "Vision creates companies. Relentless engineering scales them.",
  defaultImage: "/assets/images/ceo.jpeg",
  cardSkillPreview: ["Executive Strategy", "Enterprise Delivery", "Business Growth"],
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
