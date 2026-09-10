import type { Project } from "@/lib/data-store";

/**
 * Single Source of Truth for Official CodeXa Projects & Systems.
 * Used as the canonical fallback across Main Projects, Team Projects, Showcase Pages, and Case Studies.
 */
export const OFFICIAL_PROJECTS: Project[] = [
  // ─── 1. NEXA AI (Founder) ──────────────────────────────────────────────────
  {
    id: "proj-nexa-ai",
    title: "Nexa AI",
    slug: "nexa-ai",
    shortDesc:
      "Cutting-edge AI intelligence suite and autonomous agent workflow platform orchestrating cognitive automation and prompt pipelines.",
    overview:
      "Nexa AI is an enterprise-grade artificial intelligence engine designed for cognitive automation, real-time agent orchestration, and LLM workflow execution. It empowers developers and enterprises to chain multimodal models, execute automated code generation, and deploy adaptive autonomous agents.",
    problem:
      "Traditional AI integrations suffer from brittle prompting, lack of agent memory, high latency, and fragmented vendor APIs that cannot reliably handle autonomous multi-step reasoning.",
    solution:
      "Nexa AI provides a unified agent orchestration runtime with dynamic prompt routing, stateful execution graphs, and latency-optimized failover across leading LLM providers.",
    features: [
      "Autonomous Agent Orchestration Runtime",
      "Cognitive Workflow Pipelines & Graph Execution",
      "Multi-LLM Real-Time Provider Routing",
      "Context-Aware Stateful Memory Management",
      "High-Throughput Enterprise Intelligence Gateway",
      "Live Interactive Playground & Telemetry",
    ],
    techStack: ["Next.js", "AI Agents", "LLM APIs", "Python", "TypeScript", "Tailwind CSS"],
    category: "AI",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/hero-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://nexa-ai.xyz/",
    demoUrl: "https://nexa-ai.xyz/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 1,
    createdBy: "founder-ashu",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-nexa-1", label: "Live System", url: "https://nexa-ai.xyz/" },
    ],
  },

  // ─── 2. NEXA IDE / CODEXA IDE (Founder) ────────────────────────────────────
  {
    id: "proj-nexa-ide",
    title: "Nexa IDE / CodeXa IDE",
    slug: "nexa-ide",
    shortDesc:
      "Futuristic cloud-native coding workspace designed around developer velocity, AI-assisted vibe coding, instant compilation, and terminal previews.",
    overview:
      "A browser-based high-performance cloud developer workspace featuring deep AI code generation, AST-aware refactoring, unified project terminal, and live execution containers for hyper-fast software delivery.",
    problem:
      "Setting up local development environments with complex toolchains, Docker containers, and AI coding assistants causes friction and cross-platform inconsistencies.",
    solution:
      "Nexa IDE delivers an instant, zero-config cloud IDE featuring Monaco Editor, containerized build sandboxes, real-time collaboration, and an intelligent vibe coding co-pilot.",
    features: [
      "Monaco Editor Core with Full Language Server Protocol",
      "Integrated Cloud Terminal & Execution Sandbox",
      "AI Vibe Coding & AST-Aware Inline Refactoring",
      "Real-Time Multi-User Collaborative Pairing",
      "Instant Hot-Reload Live Previews",
      "Encrypted Workspace State Persistence",
    ],
    techStack: ["Monaco Editor", "Web IDE", "Node.js", "TypeScript", "Docker", "Next.js"],
    category: "Full Stack",
    status: "In Development",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/about-visual.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://codxa-agency.online/",
    demoUrl: "https://codxa-agency.online/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 2,
    createdBy: "founder-ashu",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-nexa-ide-1", label: "IDE Portal", url: "https://codxa-agency.online/" },
    ],
  },

  // ─── 3. CLOUDWAVE (Founder) ────────────────────────────────────────────────
  {
    id: "proj-cloudwave",
    title: "CloudWave (CloudeWave)",
    slug: "cloudwave",
    shortDesc:
      "Enterprise-grade cloud infrastructure and hosting portal delivering high-performance NVMe VPS, DDoS mitigation, and server management.",
    overview:
      "CloudWave is an enterprise infrastructure platform offering high-performance virtual private servers, Discord bot deployments, container hosting, and multi-region network failover with 99.99% SLA uptime.",
    problem:
      "Small-to-medium digital operations face prohibitive cloud server costs and intricate setup overhead for bot hosting, Linux VPS, and automated DDoS defense.",
    solution:
      "CloudWave provides cost-efficient, ultra-fast NVMe virtual servers with 1-click container deploys, intuitive control panels, and enterprise DDoS shielding.",
    features: [
      "Ultra-Fast High-Speed NVMe VPS Instances",
      "Automated Docker & Container Deployment Engine",
      "Multi-Tier Layer 4 & Layer 7 DDoS Mitigation",
      "Specialized Discord Bot 24/7 Cloud Hosting",
      "Automated Health Checks & Real-Time Telemetry",
      "Instant Server Provisioning API",
    ],
    techStack: ["Cloud Hosting", "NVMe VPS", "Linux", "Docker", "REST APIs", "FastAPI"],
    category: "Cybersecurity",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/capabilities-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://cloudewave.in/",
    demoUrl: "https://cloudewave.in/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 3,
    createdBy: "founder-ashu",
    createdAt: "2026-01-20T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-cloudwave-1", label: "Cloud Portal", url: "https://cloudewave.in/" },
    ],
  },

  // ─── 4. NEC PORTAL (Founder) ───────────────────────────────────────────────
  {
    id: "proj-nec-portal",
    title: "NEC Portal",
    slug: "nec-portal",
    shortDesc:
      "Official Academic, Research & Institutional Management Portal of Narasaraopeta Engineering College (Autonomous) with 13 departments and 418+ faculty.",
    overview:
      "The official Institutional Management Portal of Narasaraopeta Engineering College (Autonomous). Unifies academic curriculum management, verified faculty directories, publication auto-sync, and student metrics across 13 engineering departments.",
    problem:
      "Large academic institutions struggle with decentralized faculty directories, outdated departmental syllabi, fragmented research papers, and lack of verified digital credentials.",
    solution:
      "A lightning-fast, reactive web portal integrating all 13 engineering departments, searchable faculty repositories, live research paper indexing, and institutional compliance readiness.",
    features: [
      "13 Department Academic Management Hubs",
      "418+ Verified Faculty Directory with Publications",
      "Automated Research Paper & Patent Syncing",
      "Student Academic Metric & Examination Analytics",
      "Autonomous Curriculum Repository & Syllabi Download",
      "Institutional NAAC / NBA Compliance Readiness",
    ],
    techStack: ["React", "Vite", "Tailwind CSS", "Academic Engine", "TypeScript"],
    category: "Web",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/logo.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://nec-portal-rosy.vercel.app/",
    demoUrl: "https://nec-portal-rosy.vercel.app/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 4,
    createdBy: "founder-ashu",
    createdAt: "2026-02-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-nec-1", label: "College Portal", url: "https://nec-portal-rosy.vercel.app/" },
    ],
  },

  // ─── 5. NODEWAVE (Founder) ─────────────────────────────────────────────────
  {
    id: "proj-nodewave",
    title: "NodeWave",
    slug: "nodewave",
    shortDesc:
      "High-throughput Node.js microservices framework and developer runtime tooling with API gateway routing and distributed caching.",
    overview:
      "NodeWave is a backend microservices framework architected for extreme concurrency and low-latency API dispatching. Includes integrated Redis caching layers, service mesh telemetry, and rapid scaffolding CLI.",
    problem:
      "Building microservices in Node.js typically requires assembling boilerplate for routing, connection pooling, cache invalidation, and rate limiting repeatedly.",
    solution:
      "NodeWave provides a production-grade blueprint with built-in clustered process management, distributed cache sync, declarative schema validation, and health telemetry.",
    features: [
      "High-Concurrency Async Event Loop Optimization",
      "Distributed Redis Caching & Invalidation Layer",
      "Intelligent API Gateway Routing & Circuit Breaking",
      "Microservice Mesh Service Discovery",
      "Zero-Downtime Cluster Reloading CLI",
      "Built-In JWT Authentication & Role Guarding",
    ],
    techStack: ["Node.js", "Express", "Redis", "TypeScript", "Microservices", "Docker"],
    category: "Automation",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/hero-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://nodewave.in/",
    demoUrl: "https://nodewave.in/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 5,
    createdBy: "founder-ashu",
    createdAt: "2026-01-28T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-nodewave-1", label: "Framework Portal", url: "https://nodewave.in/" },
    ],
  },

  // ─── 6. CODEAXIS APPLY (Founder) ───────────────────────────────────────────
  {
    id: "proj-codeaxis-apply",
    title: "CodeAxis Apply",
    slug: "codeaxis-apply",
    shortDesc:
      "Developer screening and recruitment universe for CodeXa Developer Internship with 8-stage candidate assessment and live project testing.",
    overview:
      "The recruitment and developer assessment gateway for the CodeXa Internship Program. Candidates progress through automated portfolio grading, live coding sandboxes, technical quizzes, and verified application tracking.",
    problem:
      "Hiring developers based only on traditional resumes results in high candidate mismatch and manual hours reviewing unverified claims.",
    solution:
      "CodeAxis Apply combines interactive coding tests, automated GitHub repo inspection, and candidate progression pipelines to discover exceptional engineering talent.",
    features: [
      "8-Stage Candidate Evaluation Pipeline",
      "Real-Time Application Status Tracking",
      "Automated GitHub Repository & Project Verification",
      "Interactive Technical Screening Terminal",
      "Encrypted Applicant Data & Supabase Backend",
      "Comprehensive Admin Assessment Panel",
    ],
    techStack: ["Next.js App Router", "Supabase", "Tailwind CSS", "Framer Motion", "TypeScript"],
    category: "Full Stack",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/about-visual.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://www.codeaxisapply.xyz/",
    demoUrl: "https://www.codeaxisapply.xyz/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 6,
    createdBy: "founder-ashu",
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-codeaxis-1", label: "Apply Portal", url: "https://www.codeaxisapply.xyz/" },
    ],
  },

  // ─── 7. CODEXA AGENCY PLATFORM (Founder) ───────────────────────────────────
  {
    id: "proj-codexa-agency",
    title: "CodeXa Agency Platform",
    slug: "codexa-agency",
    shortDesc:
      "Flagship digital agency platform showcasing enterprise web development, cybersecurity testing, AI automation, and custom client solutions.",
    overview:
      "The central digital headquarters and enterprise showcase of CodeXa Agency. Features interactive cyberpunk design systems, leadership spotlight, team showcase, inquiry channels, and custom client software solutions.",
    problem:
      "Standard agency portfolios appear static, lack proof of technical capability, and do not convey the cutting-edge cyber aesthetics required for modern tech branding.",
    solution:
      "A high-impact cinematic web experience engineered with Framer Motion, 3D cyber grid shaders, responsive leadership portals, and full-stack operational architecture.",
    features: [
      "Cyberpunk HUD & Interactive Canvas Shaders",
      "Verified Leadership & Team Profiles Hub",
      "End-to-End Encrypted Client Inquiry System",
      "Dynamic Project Case Studies with Private Code Guards",
      "Real-Time Social Pulse & Activity Feed",
      "Sub-second Lighthouse Performance Score",
    ],
    techStack: ["Next.js", "Tailwind CSS", "Framer Motion", "Prisma", "PostgreSQL", "TypeScript"],
    category: "Web",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/hero-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://codxa-agency.online/",
    demoUrl: "https://codxa-agency.online/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 7,
    createdBy: "founder-ashu",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-codexa-agency-1", label: "Agency Portal", url: "https://codxa-agency.online/" },
    ],
  },

  // ─── 8. EDITH AI AGENT (Founder) ───────────────────────────────────────────
  {
    id: "proj-edith-ai-agent",
    title: "EDITH AI Agent",
    slug: "edith-ai-agent",
    shortDesc:
      "Autonomous task and productivity AI assistant engineered for cognitive workflow execution and modern developer velocity.",
    overview:
      "EDITH (Even Dead, I'm The Hero) is an autonomous task and workflow agent built into CodeXa's ecosystem to assist engineers with code generation, task triage, API integration, and continuous project automation.",
    problem:
      "Developers lose hours weekly switching contexts between IDE, documentation, terminal tasks, and repetitive deployment checks.",
    solution:
      "EDITH integrates directly into the developer workflow as a proactive companion that triages tasks, verifies syntax, and coordinates background deployment routines autonomously.",
    features: [
      "Autonomous Multi-Step Task Execution Engine",
      "Code Refactoring & AST Inspection Companion",
      "Continuous Background Pipeline Telemetry",
      "Context-Aware Long-Term Workflow Memory",
      "Seamless Integration with CodeXa IDE & Webhooks",
    ],
    techStack: ["AI Workflow", "Automation", "LLMs", "Python", "TypeScript", "FastAPI"],
    category: "AI",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/capabilities-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://codxa-agency.online/",
    demoUrl: "https://codxa-agency.online/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 8,
    createdBy: "founder-ashu",
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "founder-ashu",
      username: "ashu",
      displayName: "Ashu (Founder)",
      role: "OWNER",
      mediaUrl: "/assets/images/founder.jpeg",
    },
    links: [
      { id: "link-edith-1", label: "Agent Specs", url: "https://codxa-agency.online/" },
    ],
  },

  // ─── 9. STARX LIVE (Co-Founder Sanjay) ─────────────────────────────────────
  {
    id: "proj-starx-live",
    title: "StarX Live",
    slug: "starx-live",
    shortDesc:
      "Official web platform and booking portal for StarX Live, a premier live rock band in Hyderabad, with tour dates and VIP booking.",
    overview:
      "StarX Live is the official digital booking and media platform for Hyderabad's renowned rock band. Features high-fidelity audio streams, tour schedule calendars, musician biographies, video galleries, and direct VIP concert and club booking management.",
    problem:
      "Live music bands struggle with fragmented social media links, lack of direct event booking systems, and poor audio-visual showreel presentation.",
    solution:
      "StarX Live provides a dynamic, high-energy web platform featuring gig tour dates, embedded audio-visual performances, direct management contacts, and booking contracts.",
    features: [
      "Live Gig Tour Schedule & Interactive Venue Maps",
      "High-Resolution Audio-Visual Media & Video Reel",
      "VIP Concert & Private Event Booking Engine",
      "Musician Lineup & Instrumentalist Profiles",
      "Mobile-Optimized High-Energy Fan Experience",
    ],
    techStack: ["React", "Vite", "Tailwind CSS", "Audio Streaming", "Framer Motion"],
    category: "Web",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/hero-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://starx-live-official.vercel.app/",
    demoUrl: "https://starx-live-official.vercel.app/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: false,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 9,
    createdBy: "cofounder-sanjay",
    createdAt: "2026-02-05T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "cofounder-sanjay",
      username: "sanjay",
      displayName: "Sanjay (Co-Founder)",
      role: "CO_FOUNDER",
      mediaUrl: "/assets/images/cofounder.jpeg",
    },
    links: [
      { id: "link-starx-1", label: "Live Platform", url: "https://starx-live-official.vercel.app/" },
    ],
  },

  // ─── 10. TICKETX (Co-Founder Sanjay) ───────────────────────────────────────
  {
    id: "proj-ticket-x",
    title: "TicketX",
    slug: "ticket-x",
    shortDesc:
      "Next-gen real-time cinema and live event ticketing engine with interactive seat layout maps and multi-city showtimes.",
    overview:
      "TicketX is a high-speed event and cinema reservation system. Provides seamless real-time seat picking, multi-multiplex show schedules, instant digital QR pass generation, and fast checkout workflows.",
    problem:
      "Online ticket booking systems often suffer from clunky seat selection maps, slow database updates that cause double bookings, and confusing checkout flows.",
    solution:
      "TicketX features an ultra-responsive visual seat matrix, instantaneous seat hold timers, cross-theater showtime filtering, and rapid ticket pass delivery.",
    features: [
      "Interactive Dynamic Theater Seat Matrix",
      "Real-Time Seat Availability Lock with Expiry Timers",
      "Multi-City Multiplex & Concert Showtime Filtering",
      "Digital QR Pass Generation with Wallet Export",
      "Instant Multi-Gateway Checkout Flow",
    ],
    techStack: ["Next.js", "React", "Tailwind CSS", "Real-time Booking", "TypeScript", "Prisma"],
    category: "Full Stack",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/capabilities-bg.jpeg",
    ],
    repoUrl: null, // Source code is private
    liveUrl: "https://ticket-x-theta.vercel.app/",
    demoUrl: "https://ticket-x-theta.vercel.app/",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: false,
    isHomepageVisible: true,
    showInTeamProjects: true,
    displayOrder: 10,
    createdBy: "cofounder-sanjay",
    createdAt: "2026-02-12T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    creator: {
      id: "cofounder-sanjay",
      username: "sanjay",
      displayName: "Sanjay (Co-Founder)",
      role: "CO_FOUNDER",
      mediaUrl: "/assets/images/cofounder.jpeg",
    },
    links: [
      { id: "link-ticketx-1", label: "Ticketing Engine", url: "https://ticket-x-theta.vercel.app/" },
    ],
  },
];

/** Flagship projects to display under the Main Projects section */
export const OFFICIAL_MAIN_PROJECTS = OFFICIAL_PROJECTS.filter((p) => p.isMainProject);

/** All community and team builds (includes both Co-Founder and Founder systems) */
export const OFFICIAL_TEAM_PROJECTS = OFFICIAL_PROJECTS;
