/**
 * CodeXa Agency — Knowledge Base & FAQ Data Source
 * Factual, professional questions and answers covering services, architecture,
 * security, leadership, internships, collaboration, and support.
 */

export type FAQCategory =
  | "ALL"
  | "AGENCY"
  | "SERVICES"
  | "PROJECTS"
  | "TECHNOLOGY"
  | "SECURITY"
  | "INTERNSHIP"
  | "COLLABORATION"
  | "SUPPORT";

export interface FAQItemData {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
  featured?: boolean;
  displayOrder: number;
}

export const FAQ_CATEGORIES: FAQCategory[] = [
  "ALL",
  "AGENCY",
  "SERVICES",
  "PROJECTS",
  "TECHNOLOGY",
  "SECURITY",
  "INTERNSHIP",
  "COLLABORATION",
  "SUPPORT",
];

export const FAQS_DATA: FAQItemData[] = [
  // ─── AGENCY ─────────────────────────────────────────────────────────────
  {
    id: "what-is-codexa",
    category: "AGENCY",
    question: "What is CodeXa Agency?",
    answer:
      "CodeXa Agency is a technology-focused development agency building modern web platforms, AI-powered systems, software applications, automation tools and secure digital products for individuals, teams and businesses.",
    featured: true,
    displayOrder: 1,
  },
  {
    id: "what-does-codexa-specialize-in",
    category: "AGENCY",
    question: "What does CodeXa Agency specialize in?",
    answer:
      "CodeXa works across full-stack development, AI engineering, web applications, SaaS platforms, automation, developer tools, cloud deployment, cross-platform applications and cybersecurity-focused development.",
    displayOrder: 2,
  },
  {
    id: "who-leads-codexa-agency",
    category: "AGENCY",
    question: "Who leads CodeXa Agency?",
    answer:
      "CodeXa is led by its Founder and supported by its leadership team, including the Co-Founder, CEO and team coordination roles responsible for technology, strategy, community and project execution.",
    displayOrder: 3,
  },

  // ─── SERVICES ───────────────────────────────────────────────────────────
  {
    id: "what-services-does-codexa-provide",
    category: "SERVICES",
    question: "What services does CodeXa provide?",
    answer:
      "CodeXa provides web development, full-stack applications, AI integration, automation systems, SaaS development, application engineering, dashboard development, API integration, database systems, deployment and security-focused development.",
    displayOrder: 4,
  },
  {
    id: "can-codexa-build-complete-app",
    category: "SERVICES",
    question: "Can CodeXa build a complete application from scratch?",
    answer:
      "Yes. CodeXa can handle the complete product workflow, including planning, interface development, backend systems, database integration, APIs, authentication, deployment and post-launch improvements.",
    displayOrder: 5,
  },
  {
    id: "does-codexa-only-build-websites",
    category: "SERVICES",
    question: "Does CodeXa only build websites?",
    answer:
      "No. CodeXa works on web applications, SaaS products, developer tools, AI systems, desktop applications, cross-platform software and other modern digital products.",
    displayOrder: 6,
  },

  // ─── PROJECTS ───────────────────────────────────────────────────────────
  {
    id: "what-kind-of-projects-does-codexa-build",
    category: "PROJECTS",
    question: "What kind of projects does CodeXa build?",
    answer:
      "Projects range from developer platforms and AI systems to dashboards, automation tools, secure applications, SaaS products and experimental technology systems.",
    displayOrder: 7,
  },
  {
    id: "can-i-view-codexa-projects",
    category: "PROJECTS",
    question: "Can I view CodeXa projects?",
    answer:
      "Public projects and selected systems are shown on the CodeXa website. Some internal or private projects may not include public source code, repository links or demos.",
    displayOrder: 8,
  },
  {
    id: "does-every-project-have-public-github",
    category: "PROJECTS",
    question: "Does every project have a public GitHub repository?",
    answer:
      "No. Public repositories are shown only when intentionally made available. Private, internal or client projects may not expose source code.",
    displayOrder: 9,
  },

  // ─── TECHNOLOGY ─────────────────────────────────────────────────────────
  {
    id: "what-technologies-does-codexa-use",
    category: "TECHNOLOGY",
    question: "What technologies does CodeXa use?",
    answer:
      "Technology is selected based on the product requirements. The team works with modern frontend, backend, database, AI, cloud, automation and application development technologies.",
    displayOrder: 10,
  },
  {
    id: "does-codexa-work-with-ai",
    category: "TECHNOLOGY",
    question: "Does CodeXa work with AI?",
    answer:
      "Yes. AI is used for intelligent applications, AI agents, automation workflows, LLM integrations and AI-assisted digital products.",
    displayOrder: 11,
  },
  {
    id: "does-codexa-support-mobile-cross-platform",
    category: "TECHNOLOGY",
    question: "Does CodeXa support mobile and cross-platform development?",
    answer:
      "Yes. CodeXa supports cross-platform application development and can build software targeting modern mobile and desktop environments depending on the project.",
    displayOrder: 12,
  },

  // ─── SECURITY ───────────────────────────────────────────────────────────
  {
    id: "does-codexa-focus-on-application-security",
    category: "SECURITY",
    question: "Does CodeXa focus on application security?",
    answer:
      "Yes. Security is considered throughout development, including authentication, access controls, secure APIs, validation, data protection and safe deployment practices.",
    displayOrder: 13,
  },
  {
    id: "how-does-codexa-protect-private-project-info",
    category: "SECURITY",
    question: "How does CodeXa protect private project information?",
    answer:
      "Private project information is handled using access controls and secure development practices. Sensitive credentials and internal information are not intentionally exposed on public pages.",
    displayOrder: 14,
  },
  {
    id: "does-codexa-provide-cybersecurity-development",
    category: "SECURITY",
    question: "Does CodeXa provide cybersecurity-related development?",
    answer:
      "Yes. CodeXa works on security-aware applications, cybersecurity tools, authentication systems and secure software architecture.",
    displayOrder: 15,
  },

  // ─── INTERNSHIP ─────────────────────────────────────────────────────────
  {
    id: "does-codexa-provide-internships",
    category: "INTERNSHIP",
    question: "Does CodeXa provide internships?",
    answer:
      "CodeXa runs developer-focused learning and internship programs where participants can improve technical skills, work on projects and gain practical development experience.",
    displayOrder: 16,
  },
  {
    id: "what-can-participants-learn",
    category: "INTERNSHIP",
    question: "What can participants learn?",
    answer:
      "Depending on the program, participants can learn programming, web development, backend systems, project workflows, GitHub, deployment, AI-assisted development and practical software engineering.",
    displayOrder: 17,
  },
  {
    id: "is-the-internship-focused-only-on-theory",
    category: "INTERNSHIP",
    question: "Is the internship focused only on theory?",
    answer:
      "No. The focus is on practical development, project building, collaboration and learning through real implementation workflows.",
    displayOrder: 18,
  },

  // ─── COLLABORATION ──────────────────────────────────────────────────────
  {
    id: "can-i-work-with-codexa-on-a-project",
    category: "COLLABORATION",
    question: "Can I work with CodeXa on a project?",
    answer:
      "Yes. Visitors can submit a project inquiry through the official CodeXa contact form.",
    displayOrder: 19,
  },
  {
    id: "can-developers-collaborate-with-codexa",
    category: "COLLABORATION",
    question: "Can developers collaborate with CodeXa?",
    answer:
      "Collaboration opportunities may be available depending on current projects, team requirements and development needs.",
    displayOrder: 20,
  },
  {
    id: "how-can-i-contact-codexa",
    category: "COLLABORATION",
    question: "How can I contact CodeXa?",
    answer:
      "Use the official Contact / Project Application section on the website to submit your requirements.",
    displayOrder: 21,
  },

  // ─── SUPPORT ────────────────────────────────────────────────────────────
  {
    id: "does-codexa-provide-support-after-deployment",
    category: "SUPPORT",
    question: "Does CodeXa provide support after deployment?",
    answer:
      "Support depends on the project agreement and may include bug fixes, improvements, deployment support, maintenance and future feature development.",
    displayOrder: 22,
  },
  {
    id: "can-existing-project-be-improved",
    category: "SUPPORT",
    question: "Can an existing project be improved instead of rebuilt?",
    answer:
      "Yes. Existing applications can be reviewed and improved when the current architecture allows safe enhancement.",
    displayOrder: 23,
  },
  {
    id: "how-long-does-a-project-take",
    category: "SUPPORT",
    question: "How long does a project take?",
    answer:
      "Development time depends on project size, complexity, features, integrations and testing requirements. A realistic timeline is discussed after reviewing the project requirements.",
    displayOrder: 24,
  },
];
