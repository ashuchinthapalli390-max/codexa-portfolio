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
  url?: string;
  category?: string;
  isPrivate?: boolean;
  techStack?: string[];
  status?: string;
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
          name: "Nexa AI",
          category: "Artificial Intelligence",
          url: "https://nexa-ai.xyz/",
          isPrivate: true,
          techStack: ["Next.js", "AI Agents", "LLM APIs", "Python", "TypeScript"],
          status: "Live",
          description:
            "Cutting-edge AI intelligence suite and autonomous agent workflow platform. Orchestrates cognitive automation, custom prompt pipelines, and intelligent assistant workflows.",
        },
        {
          name: "Nexa IDE / CodeXa IDE",
          category: "Developer Platform",
          url: "https://codxa-agency.online/",
          isPrivate: true,
          techStack: ["Monaco Editor", "Web IDE", "Node.js", "TypeScript"],
          status: "In Development",
          description:
            "A futuristic cloud-native coding workspace designed around modern developer velocity, AI-assisted vibe coding, instant project compilation, and terminal previews.",
        },
        {
          name: "CloudWave (CloudeWave)",
          category: "Cloud Infrastructure",
          url: "https://cloudewave.in/",
          isPrivate: true,
          techStack: ["Cloud Hosting", "NVMe VPS", "Linux", "Docker", "REST APIs"],
          status: "Live",
          description:
            "Enterprise-grade cloud infrastructure and hosting portal. Delivers high-performance NVMe VPS, automated container deployments, Discord bot hosting, DDoS mitigation, and 99.99% uptime server management.",
        },
        {
          name: "NEC Portal",
          category: "Institutional Platform",
          url: "https://nec-portal-rosy.vercel.app/",
          isPrivate: true,
          techStack: ["React", "Vite", "Tailwind CSS", "Academic Engine"],
          status: "Live",
          description:
            "Official Academic, Research & Institutional Management Portal of Narasaraopeta Engineering College (Autonomous). Integrates 13 academic departments, 418+ verified faculty directories, research publication auto-sync, and student analytics.",
        },
        {
          name: "NodeWave",
          category: "Developer System",
          url: "https://nodewave.in/",
          isPrivate: true,
          techStack: ["Node.js", "Express", "Redis", "TypeScript", "Microservices"],
          status: "Live",
          description:
            "High-throughput Node.js microservices framework and developer runtime tooling. Offers backend automation, API gateway routing, distributed caching, and scalable server orchestration.",
        },
        {
          name: "CodeAxis Apply",
          category: "Recruitment Universe",
          url: "https://www.codeaxisapply.xyz/",
          isPrivate: true,
          techStack: ["Next.js App Router", "Supabase", "Tailwind CSS", "Framer Motion"],
          status: "Live",
          description:
            "Developer screening and recruitment universe for CodeXa Developer Internship. Features 8-stage candidate assessment, live application tracking, automated project evaluation, and interactive screening terminal.",
        },
        {
          name: "CodeXa Agency Platform",
          category: "Enterprise Agency",
          url: "https://codxa-agency.online/",
          isPrivate: true,
          techStack: ["Next.js", "Tailwind CSS", "Framer Motion", "Prisma", "PostgreSQL"],
          status: "Live",
          description:
            "Flagship digital agency platform showcasing enterprise web development, cybersecurity testing, AI automation, and custom client software solutions with interactive cyber aesthetics.",
        },
        {
          name: "EDITH AI Agent",
          category: "AI Agent",
          url: "https://codxa-agency.online/",
          isPrivate: true,
          techStack: ["AI Workflow", "Automation", "LLMs"],
          status: "Live",
          description:
            "An AI-focused assistant/workflow concept built to support smarter productivity, autonomous task execution, and modern developer engineering.",
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
    "Sanjay drives operations, cross-platform product architecture, and ecosystem expansion at CodeXa Agency, ensuring smooth coordination across engineering, event platforms, and client solutions.",
  modalSections: [
    {
      title: "Projects & Creations",
      type: "projects",
      projects: [
        {
          name: "StarX Live",
          category: "Live Music & Entertainment",
          url: "https://starx-live-official.vercel.app/",
          isPrivate: true,
          techStack: ["React", "Vite", "Tailwind CSS", "Audio Streaming"],
          status: "Live",
          description:
            "Official web platform and booking portal for StarX Live, a premier live rock band in Hyderabad. Features audio-visual performance galleries, live event tour schedules, musician lineup profiles, and direct VIP booking management.",
        },
        {
          name: "TicketX",
          category: "Ticketing & Event Platform",
          url: "https://ticket-x-theta.vercel.app/",
          isPrivate: true,
          techStack: ["Next.js", "React", "Tailwind CSS", "Real-time Booking"],
          status: "Live",
          description:
            "Next-gen real-time cinema and live event ticketing engine. Features interactive theater seat layout maps, multi-city showtime booking, digital pass generation, bookmarking, and payment checkout integration.",
        },
      ],
    },
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
