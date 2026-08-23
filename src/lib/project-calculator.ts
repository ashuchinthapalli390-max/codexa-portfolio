/**
 * CodeXa Project Application & Dynamic Advance Calculator Engine
 *
 * Rules:
 * - Advance amount represents a "Project Booking Deposit / Priority Slot Advance", NOT full project cost.
 * - Base Advance ranges from ₹2,000 to ₹7,000 based on project classification.
 * - Feature add-on weights dynamically adjust the booking advance.
 * - Strict clamping: Minimum ₹2,000, Maximum ₹7,000.
 * - All computations MUST execute identically on server-side and client-side.
 */

export interface ProjectTypeDefinition {
  id: string;
  name: string;
  category: string;
  baseAdvance: number;
  description: string;
  recommendedTimeline: string;
  badge?: string;
}

export const PROJECT_TYPES: ProjectTypeDefinition[] = [
  {
    id: "personal-portfolio",
    name: "Personal Portfolio",
    category: "Personal & Portfolio",
    baseAdvance: 2000,
    description: "Showcase personal projects, skills, resume, and experience with interactive 3D/dark styling.",
    recommendedTimeline: "1–2 Weeks",
  },
  {
    id: "landing-page",
    name: "Landing Page",
    category: "Marketing & Conversion",
    baseAdvance: 2500,
    description: "High-converting product or campaign landing page engineered for maximum conversion & speed.",
    recommendedTimeline: "1–2 Weeks",
  },
  {
    id: "blog-content",
    name: "Blog / Content Website",
    category: "Publishing & Media",
    baseAdvance: 2500,
    description: "Modern content portal with MDX/CMS integration, category filters, and newsletter capture.",
    recommendedTimeline: "1–2 Weeks",
  },
  {
    id: "business-website",
    name: "Business Website",
    category: "Corporate & Business",
    baseAdvance: 3000,
    description: "Professional corporate presence with service showcases, lead generation, and team profiles.",
    recommendedTimeline: "2–4 Weeks",
  },
  {
    id: "agency-website",
    name: "Agency Website",
    category: "Agency & Studio",
    baseAdvance: 3500,
    description: "Futuristic agency portal featuring case studies, animated interactive reels, and quote forms.",
    recommendedTimeline: "2–4 Weeks",
  },
  {
    id: "corporate-website",
    name: "Corporate Website",
    category: "Enterprise & Corporate",
    baseAdvance: 3500,
    description: "Multi-page corporate platform with compliance disclosures, investor relations, and security.",
    recommendedTimeline: "2–4 Weeks",
  },
  {
    id: "event-website",
    name: "Event Website",
    category: "Events & Summits",
    baseAdvance: 3500,
    description: "Summit/hackathon/conference site with speaker lineups, ticket registration, and schedule.",
    recommendedTimeline: "1–2 Weeks",
  },
  {
    id: "community-platform",
    name: "Community Platform",
    category: "Social & Community",
    baseAdvance: 4000,
    description: "Member hub with user feeds, discussions, direct messaging, and community moderation.",
    recommendedTimeline: "2–4 Weeks",
  },
  {
    id: "booking-platform",
    name: "Booking Platform",
    category: "Services & Appointments",
    baseAdvance: 4500,
    description: "Interactive scheduling system with calendar slots, payments, automated reminders, and CRM.",
    recommendedTimeline: "2–4 Weeks",
  },
  {
    id: "ecommerce-website",
    name: "E-Commerce Website",
    category: "Commerce & Retail",
    baseAdvance: 5000,
    description: "Storefront with product catalog, cart, Razorpay checkout, inventory, and order management.",
    recommendedTimeline: "2–4 Weeks",
    badge: "Popular",
  },
  {
    id: "lms-edtech",
    name: "LMS / EdTech Platform",
    category: "Education & Learning",
    baseAdvance: 5500,
    description: "Online academy with courses, video streaming, quizzes, certificates, and student portals.",
    recommendedTimeline: "1–2 Months",
  },
  {
    id: "admin-management",
    name: "Admin / Management System",
    category: "Internal Tools & ERP",
    baseAdvance: 5500,
    description: "Dense internal control center with charts, RBAC roles, audit logs, and operational workflows.",
    recommendedTimeline: "2–4 Weeks",
  },
  {
    id: "saas-platform",
    name: "SaaS Platform",
    category: "Cloud Software & SaaS",
    baseAdvance: 6000,
    description: "Full-stack subscription software with auth, multi-tenancy, Stripe/Razorpay billing, and API.",
    recommendedTimeline: "1–2 Months",
    badge: "High Demand",
  },
  {
    id: "ai-platform",
    name: "AI-Powered Website / Platform",
    category: "AI & Next-Gen Systems",
    baseAdvance: 6500,
    description: "Custom AI agent workflows, RAG knowledge bases, LLM integrations, and intelligent automation.",
    recommendedTimeline: "1–2 Months",
    badge: "Specialized",
  },
  {
    id: "mobile-application",
    name: "Mobile / Cross-Platform Application",
    category: "iOS & Android",
    baseAdvance: 7000,
    description: "React Native / Flutter cross-platform mobile apps with push notifications and device APIs.",
    recommendedTimeline: "1–2 Months",
  },
  {
    id: "custom-other",
    name: "Custom / Other Architecture",
    category: "Bespoke Engineering",
    baseAdvance: 4000,
    description: "Bespoke full-stack system, developer tool, Discord bot, or hybrid enterprise solution.",
    recommendedTimeline: "Flexible",
  },
];

export interface FeatureWeight {
  id: string;
  name: string;
  category: "auth" | "dashboard" | "database" | "feature" | "animation" | "integration";
  addon: number;
  description?: string;
}

export const FEATURE_ADDONS: Record<string, FeatureWeight> = {
  // Authentication
  auth_required: {
    id: "auth_required",
    name: "Authentication (Email/Google Login)",
    category: "auth",
    addon: 300,
    description: "Secure login system with session tokens & password hashing.",
  },
  otp_2fa: {
    id: "otp_2fa",
    name: "OTP / Two-Factor Authentication (2FA)",
    category: "auth",
    addon: 400,
    description: "TOTP authenticator app or email/phone OTP verification.",
  },
  multi_role: {
    id: "multi_role",
    name: "Multi-Role RBAC System",
    category: "auth",
    addon: 500,
    description: "Granular permissions for Superadmin, Admin, Staff, Customer.",
  },

  // Database
  database: {
    id: "database",
    name: "Cloud Database (PostgreSQL / Supabase)",
    category: "database",
    addon: 300,
    description: "Relational persistence with connection pooling & indexing.",
  },

  // Dashboards
  user_dashboard: {
    id: "user_dashboard",
    name: "User / Customer Dashboard",
    category: "dashboard",
    addon: 400,
    description: "Client portal with order/ticket history and profile controls.",
  },
  admin_dashboard: {
    id: "admin_dashboard",
    name: "Admin Management Dashboard",
    category: "dashboard",
    addon: 500,
    description: "Comprehensive control center for orders, users, metrics.",
  },
  analytics_dashboard: {
    id: "analytics_dashboard",
    name: "Analytics & Metrics Dashboard",
    category: "dashboard",
    addon: 400,
    description: "Interactive KPI charts, traffic graphs, and reporting.",
  },

  // Core Features
  payment_integration: {
    id: "payment_integration",
    name: "Payment Gateway (Razorpay / UPI)",
    category: "feature",
    addon: 500,
    description: "Server-verified payments, instant webhooks, and receipts.",
  },
  subscription_system: {
    id: "subscription_system",
    name: "Subscription & Recurring Billing",
    category: "feature",
    addon: 700,
    description: "Tiered plan management, billing cycles, and automated invoicing.",
  },
  ecommerce_system: {
    id: "ecommerce_system",
    name: "E-Commerce System (Cart/Catalog/Inventory)",
    category: "feature",
    addon: 700,
    description: "Complete shopping workflow with stock limits & variants.",
  },
  booking_system: {
    id: "booking_system",
    name: "Interactive Booking & Slot System",
    category: "feature",
    addon: 500,
    description: "Real-time calendar slot reservation and automated scheduling.",
  },
  realtime_chat: {
    id: "realtime_chat",
    name: "Real-Time Chat & Messaging",
    category: "feature",
    addon: 700,
    description: "Live messaging, notifications, and typing indicators.",
  },
  ai_integration: {
    id: "ai_integration",
    name: "AI Engine Integration (LLM / RAG / Agents)",
    category: "feature",
    addon: 800,
    description: "Intelligent generative features, chat assistants, or vector search.",
  },
  cms: {
    id: "cms",
    name: "Content Management System (CMS)",
    category: "feature",
    addon: 300,
    description: "Dynamic article/project creation without code edits.",
  },
  file_upload: {
    id: "file_upload",
    name: "Cloud File & Image Uploads",
    category: "feature",
    addon: 300,
    description: "Secure storage bucket uploads with media optimization.",
  },
  api_integration: {
    id: "api_integration",
    name: "External REST / GraphQL API Integration",
    category: "integration",
    addon: 400,
    description: "Third-party service connectivity and webhooks.",
  },
  email_notifications: {
    id: "email_notifications",
    name: "Automated Email Notifications (Resend)",
    category: "feature",
    addon: 250,
    description: "Transactional notifications and alert triggers.",
  },
  advanced_search: {
    id: "advanced_search",
    name: "Advanced Search & Multi-Filters",
    category: "feature",
    addon: 250,
    description: "Instant faceted query filtering across large data collections.",
  },

  // Animations
  advanced_animations: {
    id: "advanced_animations",
    name: "Advanced Smooth Motion & Parallax",
    category: "animation",
    addon: 300,
    description: "Framer-motion scroll triggers, interactive cards, micro-effects.",
  },
  cinematic_animations: {
    id: "cinematic_animations",
    name: "Cinematic 3D & Spline / WebGL Elements",
    category: "animation",
    addon: 500,
    description: "High-impact visual canvas interactions and 3D scenes.",
  },
};

export interface AdvanceCalculationResult {
  baseAdvance: number;
  featureAdvance: number;
  rawTotal: number;
  finalAdvance: number; // strictly clamped between 2,000 and 7,000
  isMinCapped: boolean;
  isMaxCapped: boolean;
  breakdown: Array<{
    label: string;
    amount: number;
    type: "base" | "addon";
  }>;
}

export interface CalculationInput {
  projectTypeId: string;
  features?: string[];
  authOption?: string;
  authExtras?: string[];
  dashboardOption?: string;
  databaseOption?: string;
  animationLevel?: string;
  integrations?: string[];
  specificFeatures?: Record<string, boolean>;
}

/**
 * Calculates project advance with strict bounding rules:
 * MIN: ₹2,000
 * MAX: ₹7,000
 */
export function calculateProjectAdvance(input: CalculationInput): AdvanceCalculationResult {
  const matchedProject = PROJECT_TYPES.find(
    (p) => p.id === input.projectTypeId || p.name.toLowerCase() === (input.projectTypeId || "").toLowerCase()
  );
  const baseAdvance = matchedProject ? matchedProject.baseAdvance : 4000;

  const breakdown: Array<{ label: string; amount: number; type: "base" | "addon" }> = [
    {
      label: `${matchedProject ? matchedProject.name : "Custom Architecture"} Base Advance`,
      amount: baseAdvance,
      type: "base",
    },
  ];

  let featureAdvance = 0;
  const appliedAddons = new Set<string>();

  // 1. Explicit features list
  if (Array.isArray(input.features)) {
    for (const featId of input.features) {
      if (FEATURE_ADDONS[featId] && !appliedAddons.has(featId)) {
        appliedAddons.add(featId);
        featureAdvance += FEATURE_ADDONS[featId].addon;
        breakdown.push({
          label: FEATURE_ADDONS[featId].name,
          amount: FEATURE_ADDONS[featId].addon,
          type: "addon",
        });
      }
    }
  }

  // 2. Authentication selection
  if (input.authOption && input.authOption !== "No Login Required") {
    if (!appliedAddons.has("auth_required")) {
      appliedAddons.add("auth_required");
      featureAdvance += FEATURE_ADDONS.auth_required.addon;
      breakdown.push({
        label: "Authentication System",
        amount: FEATURE_ADDONS.auth_required.addon,
        type: "addon",
      });
    }

    if (Array.isArray(input.authExtras)) {
      if (input.authExtras.includes("Two-Factor Authentication") && !appliedAddons.has("otp_2fa")) {
        appliedAddons.add("otp_2fa");
        featureAdvance += FEATURE_ADDONS.otp_2fa.addon;
        breakdown.push({
          label: "Two-Factor Auth / OTP",
          amount: FEATURE_ADDONS.otp_2fa.addon,
          type: "addon",
        });
      }
      if (input.authExtras.includes("Role-Based Access") && !appliedAddons.has("multi_role")) {
        appliedAddons.add("multi_role");
        featureAdvance += FEATURE_ADDONS.multi_role.addon;
        breakdown.push({
          label: "Role-Based Access Control",
          amount: FEATURE_ADDONS.multi_role.addon,
          type: "addon",
        });
      }
    }
  }

  // 3. Dashboard selection
  if (input.dashboardOption && input.dashboardOption !== "No Dashboard") {
    if (input.dashboardOption.includes("Admin") && !appliedAddons.has("admin_dashboard")) {
      appliedAddons.add("admin_dashboard");
      featureAdvance += FEATURE_ADDONS.admin_dashboard.addon;
      breakdown.push({
        label: "Admin Dashboard Console",
        amount: FEATURE_ADDONS.admin_dashboard.addon,
        type: "addon",
      });
    } else if (!appliedAddons.has("user_dashboard")) {
      appliedAddons.add("user_dashboard");
      featureAdvance += FEATURE_ADDONS.user_dashboard.addon;
      breakdown.push({
        label: "User Dashboard Portal",
        amount: FEATURE_ADDONS.user_dashboard.addon,
        type: "addon",
      });
    }
  }

  // 4. Database selection
  if (input.databaseOption === "Yes" && !appliedAddons.has("database")) {
    appliedAddons.add("database");
    featureAdvance += FEATURE_ADDONS.database.addon;
    breakdown.push({
      label: "Cloud Database Architecture",
      amount: FEATURE_ADDONS.database.addon,
      type: "addon",
    });
  }

  // 5. Animation selection
  if (input.animationLevel === "Cinematic" && !appliedAddons.has("cinematic_animations")) {
    appliedAddons.add("cinematic_animations");
    featureAdvance += FEATURE_ADDONS.cinematic_animations.addon;
    breakdown.push({
      label: "Cinematic 3D & Motion FX",
      amount: FEATURE_ADDONS.cinematic_animations.addon,
      type: "addon",
    });
  } else if (input.animationLevel === "Advanced" && !appliedAddons.has("advanced_animations")) {
    appliedAddons.add("advanced_animations");
    featureAdvance += FEATURE_ADDONS.advanced_animations.addon;
    breakdown.push({
      label: "Advanced Smooth Animations",
      amount: FEATURE_ADDONS.advanced_animations.addon,
      type: "addon",
    });
  }

  // 6. Specific contextual flags
  if (input.specificFeatures) {
    if (input.specificFeatures.ai_capabilities && !appliedAddons.has("ai_integration")) {
      appliedAddons.add("ai_integration");
      featureAdvance += FEATURE_ADDONS.ai_integration.addon;
      breakdown.push({
        label: "AI Agent / Model Workflows",
        amount: FEATURE_ADDONS.ai_integration.addon,
        type: "addon",
      });
    }
    if (input.specificFeatures.ecommerce && !appliedAddons.has("ecommerce_system")) {
      appliedAddons.add("ecommerce_system");
      featureAdvance += FEATURE_ADDONS.ecommerce_system.addon;
      breakdown.push({
        label: "E-Commerce Workflow",
        amount: FEATURE_ADDONS.ecommerce_system.addon,
        type: "addon",
      });
    }
    if (input.specificFeatures.subscription && !appliedAddons.has("subscription_system")) {
      appliedAddons.add("subscription_system");
      featureAdvance += FEATURE_ADDONS.subscription_system.addon;
      breakdown.push({
        label: "Subscription Management",
        amount: FEATURE_ADDONS.subscription_system.addon,
        type: "addon",
      });
    }
  }

  const rawTotal = baseAdvance + featureAdvance;
  // Strictly clamp between 2,000 and 7,000
  const finalAdvance = Math.min(7000, Math.max(2000, rawTotal));

  return {
    baseAdvance,
    featureAdvance,
    rawTotal,
    finalAdvance,
    isMinCapped: rawTotal < 2000,
    isMaxCapped: rawTotal > 7000,
    breakdown,
  };
}

/**
 * Generates human-readable, unique project application reference ID
 * Example: CXA-PRJ-2026-8F29K
 */
export function generateProjectRefId(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CXA-PRJ-${year}-${random}`;
}

/**
 * Calculates internal lead quality score (0 - 100)
 */
export function calculateLeadQualityScore(data: {
  description: string;
  budgetRange: string;
  timeline: string;
  phone: string;
  hasExistingDesign?: string;
  featuresCount: number;
}): { score: number; quality: "HIGH" | "MEDIUM" | "STANDARD" } {
  let score = 50; // Base score

  // 1. Description depth
  const descLen = (data.description || "").trim().length;
  if (descLen > 150) score += 20;
  else if (descLen > 50) score += 10;
  else if (descLen < 20) score -= 15;

  // 2. Budget realism
  if (data.budgetRange === "₹75,000+" || data.budgetRange === "₹40,000–₹75,000") score += 15;
  else if (data.budgetRange === "₹20,000–₹40,000") score += 10;
  else if (data.budgetRange === "Below ₹10,000") score -= 5;

  // 3. Contact completeness
  if (data.phone && data.phone.trim().length >= 10) score += 10;

  // 4. Feature specification detail
  if (data.featuresCount >= 5) score += 10;
  else if (data.featuresCount >= 2) score += 5;

  // Clamp 0–100
  score = Math.min(100, Math.max(0, score));

  let quality: "HIGH" | "MEDIUM" | "STANDARD" = "STANDARD";
  if (score >= 75) quality = "HIGH";
  else if (score >= 50) quality = "MEDIUM";

  return { score, quality };
}
