"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Shield, Lock, Layers, Cpu, Globe, Smartphone,
  LayoutDashboard, ShoppingCart, BookOpen, Calendar, Users, Database, Key, Palette, Clock, Loader2, Check, Zap,
  MessageSquare, Search, Mail, Upload, CreditCard, Repeat, FileText, Building2, Briefcase, PartyPopper, Bot,
  Wrench, User, Rocket, Eye, LucideIcon, Box,
} from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PROJECT_TYPES, calculateProjectAdvance } from "@/lib/project-calculator";
import { scrollToId } from "@/lib/scroll-store";
import type { Blueprint, BuildKind, BuildModule } from "@/components/builder/ProjectBuilderScene";

// WebGL builder is client-only and code-split so the form paints first.
const ProjectBuilderScene = dynamic(() => import("@/components/builder/ProjectBuilderScene"), { ssr: false });

declare global {
  interface Window {
    Razorpay: any;
  }
}

const EASE = [0.16, 1, 0.3, 1] as const;

// 6 Structured Steps
const STEPS = [
  { id: 1, title: "Project type", short: "Type", icon: Box },
  { id: 2, title: "Goals & features", short: "Features", icon: Zap },
  { id: 3, title: "Tech stack", short: "Stack", icon: Database },
  { id: 4, title: "Design & scope", short: "Design", icon: Palette },
  { id: 5, title: "Timeline & contact", short: "Details", icon: Clock },
  { id: 6, title: "Review & book", short: "Book", icon: Lock },
];

const PURPOSE_OPTIONS = [
  "Showcase Myself / My Work",
  "Showcase My Business",
  "Sell Products",
  "Sell Services",
  "Receive Enquiries",
  "Accept Bookings",
  "Manage Customers",
  "Manage Employees / Team",
  "Provide Online Courses",
  "Build a Community",
  "Provide AI Features",
  "Automate Business Processes",
  "Provide a Dashboard",
  "Build a Subscription Platform",
  "Internal Company Software",
  "Other",
];

const DESIGN_STYLES = [
  { id: "Dark", label: "Dark Mode", desc: "CodeXa signature cyber theme", color: "#FF1E3C" },
  { id: "Futuristic", label: "Futuristic", desc: "Neon & sci-fi aesthetics", color: "#22D3EE" },
  { id: "Premium", label: "Premium Luxury", desc: "Sleek, high-contrast & elegant", color: "#F5C518" },
  { id: "Minimal", label: "Minimal Modern", desc: "Clean typography & spacing", color: "#E5E5E5" },
  { id: "Glassmorphism", label: "Glassmorphism", desc: "Translucent frosted layers", color: "#93C5FD" },
  { id: "Corporate", label: "Corporate", desc: "Formal & trust-focused", color: "#3B82F6" },
  { id: "Cyber", label: "Cyberpunk", desc: "High energy & vibrant accents", color: "#FF2BD6" },
  { id: "Developer Style", label: "Developer / Terminal", desc: "Monospace & code-first", color: "#22C55E" },
  { id: "Colorful", label: "Vibrant Gradient", desc: "Rich chromatic palettes", color: "#A855F7" },
  { id: "Custom", label: "Custom Bespoke", desc: "Tailored to your brand", color: "#FF6B35" },
];

const INTEGRATION_OPTIONS = [
  "Razorpay (UPI / Cards)",
  "Google OAuth",
  "Supabase / PostgreSQL",
  "Firebase",
  "Resend / Email Services",
  "OpenAI / Anthropic API",
  "Google Maps API",
  "GitHub OAuth / API",
  "AWS S3 / Cloud Storage",
  "WhatsApp API",
  "REST / GraphQL APIs",
];

const FEATURE_OPTIONS: { id: string; name: string; desc: string; icon: LucideIcon; shape: BuildModule["shape"] }[] = [
  { id: "payment_integration", name: "Payment gateway", desc: "Razorpay / UPI checkout", icon: CreditCard, shape: "card" },
  { id: "ecommerce_system", name: "Shopping cart & catalog", desc: "Products, variants, checkout", icon: ShoppingCart, shape: "cart" },
  { id: "subscription_system", name: "Subscriptions & billing", desc: "Tiered, recurring plans", icon: Repeat, shape: "card" },
  { id: "booking_system", name: "Booking & slots", desc: "Calendar scheduling", icon: Calendar, shape: "calendar" },
  { id: "realtime_chat", name: "Real-time chat", desc: "Live messages & channels", icon: MessageSquare, shape: "chat" },
  { id: "ai_integration", name: "AI agents & LLMs", desc: "Assistants, RAG, automations", icon: Bot, shape: "ai" },
  { id: "cms", name: "Content manager (CMS)", desc: "Edit posts without code", icon: FileText, shape: "layers" },
  { id: "file_upload", name: "File & image uploads", desc: "Cloud media pipeline", icon: Upload, shape: "box" },
  { id: "email_notifications", name: "Automated emails", desc: "Transactional alerts", icon: Mail, shape: "box" },
  { id: "advanced_search", name: "Search & filters", desc: "Faceted, instant results", icon: Search, shape: "search" },
];

const TYPE_ICONS: Record<string, LucideIcon> = {
  "personal-portfolio": User,
  "landing-page": Rocket,
  "blog-content": BookOpen,
  "business-website": Building2,
  "agency-website": Briefcase,
  "corporate-website": Building2,
  "event-website": PartyPopper,
  "community-platform": Users,
  "booking-platform": Calendar,
  "ecommerce-website": ShoppingCart,
  "lms-edtech": BookOpen,
  "admin-management": LayoutDashboard,
  "saas-platform": Layers,
  "ai-platform": Bot,
  "mobile-application": Smartphone,
  "custom-other": Wrench,
};

const PLATFORM_TYPES = new Set(["community-platform", "booking-platform", "ecommerce-website", "lms-edtech", "admin-management", "saas-platform", "custom-other"]);

function pagesFrom(range: string) {
  if (range.startsWith("1 Page")) return 1;
  if (range.startsWith("2")) return 3;
  if (range.startsWith("6")) return 4;
  if (range.startsWith("11")) return 5;
  if (range.startsWith("20")) return 6;
  return 5;
}

export default function ProjectRequestPage() {
  const router = useRouter();

  // Current wizard step
  const [currentStep, setCurrentStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Project Type
    projectType: "saas-platform",
    customProjectType: "",
    closestCategory: "Web Application",

    // Step 2: Purpose & Features
    purposes: ["Showcase My Business", "Sell Services"] as string[],
    features: ["payment_integration", "auth_required", "admin_dashboard"] as string[],
    specificChecklist: [] as string[],

    // Step 3: Technical Architecture
    authOption: "Email + Password",
    authExtras: ["Forgot Password", "Role-Based Access"] as string[],
    dashboardOption: "Admin Dashboard",
    dashboardFeatures: ["Analytics", "User Management", "Payments", "Settings"] as string[],
    databaseOption: "Yes",
    databaseDataTypes: ["User Accounts", "Customer Information", "Project Data"] as string[],
    integrations: ["Razorpay (UPI / Cards)", "Google OAuth", "Resend / Email Services"] as string[],

    // Step 4: Design & Scope
    designStyles: ["Dark", "Futuristic", "Premium"] as string[],
    animationLevel: "Advanced", // Minimal, Standard, Advanced, Cinematic
    pageRange: "2–5 Pages",
    hasExistingDesign: "No — CodeXa should design everything",
    designLinks: "",
    existingProjectType: "Build From Scratch",
    existingProjectUrl: "",
    existingTechStack: "",

    // Step 5: Timeline, Budget & Contact
    timeline: "2–4 Weeks",
    budgetRange: "₹20,000–₹40,000",
    fullName: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    preferredContact: "WhatsApp",
    description: "",

    // Step 6: Terms
    termsInfoCorrect: false,
    termsAdvanceUnderstood: false,
    termsReviewUnderstood: false,
    termsPolicyAccepted: false,
  });

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setRazorpayLoaded] = useState(false);

  // Real-time advance calculation (shared engine — identical on the server)
  const advanceResult = useMemo(() => {
    return calculateProjectAdvance({
      projectTypeId: formData.projectType,
      features: formData.features,
      authOption: formData.authOption,
      authExtras: formData.authExtras,
      dashboardOption: formData.dashboardOption,
      databaseOption: formData.databaseOption,
      animationLevel: formData.animationLevel,
      integrations: formData.integrations,
      specificFeatures: {
        ai_capabilities:
          formData.projectType === "ai-platform" ||
          formData.purposes.includes("Provide AI Features") ||
          formData.specificChecklist.some((f) => f.toLowerCase().includes("ai")),
        ecommerce: formData.projectType === "ecommerce-website" || formData.purposes.includes("Sell Products"),
        subscription: formData.projectType === "saas-platform" || formData.purposes.includes("Build a Subscription Platform"),
      },
    });
  }, [
    formData.projectType,
    formData.features,
    formData.authOption,
    formData.authExtras,
    formData.dashboardOption,
    formData.databaseOption,
    formData.animationLevel,
    formData.integrations,
    formData.purposes,
    formData.specificChecklist,
  ]);

  // Selected project type object
  const currentProjectTypeObj = useMemo(() => {
    return PROJECT_TYPES.find((p) => p.id === formData.projectType) || PROJECT_TYPES[0];
  }, [formData.projectType]);

  // Helper to toggle array item
  const toggleArrayItem = (field: keyof typeof formData, item: string) => {
    setFormData((prev) => {
      const current = (prev[field] as string[]) || [];
      const updated = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => setFormData((prev) => ({ ...prev, [key]: value }));

  // Step Validation before progressing
  const validateStep = (stepNumber: number): boolean => {
    setErrorMessage(null);

    if (stepNumber === 1) {
      if (!formData.projectType) {
        setErrorMessage("Please select a project type.");
        return false;
      }
      if (formData.projectType === "custom-other" && !formData.customProjectType.trim()) {
        setErrorMessage("Please describe your custom project idea.");
        return false;
      }
    }

    if (stepNumber === 2) {
      if (formData.purposes.length === 0) {
        setErrorMessage("Please select at least one primary project purpose.");
        return false;
      }
    }

    if (stepNumber === 5) {
      if (!formData.fullName.trim()) {
        setErrorMessage("Please enter your Full Name.");
        return false;
      }
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
        setErrorMessage("Please enter a valid Email Address.");
        return false;
      }
      if (!formData.phone.trim() || formData.phone.trim().length < 8) {
        setErrorMessage("Please provide a valid Phone / WhatsApp number.");
        return false;
      }
      if (!formData.description.trim() || formData.description.trim().length < 20) {
        setErrorMessage("Please provide a detailed project description (minimum 20 characters).");
        return false;
      }
    }

    return true;
  };

  const goTo = (step: number) => {
    setCurrentStep(step);
    setMaxVisited((m) => Math.max(m, step));
    setTimeout(() => scrollToId("builder"), 50);
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) goTo(Math.min(6, currentStep + 1));
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    goTo(Math.max(1, currentStep - 1));
  };

  // Check if all 4 terms are checked
  const allTermsAccepted =
    formData.termsInfoCorrect && formData.termsAdvanceUnderstood && formData.termsReviewUnderstood && formData.termsPolicyAccepted;

  // Handle Payment & Order Creation
  const handleInitiatePayment = async () => {
    if (!allTermsAccepted) {
      setErrorMessage("Please accept all terms checkboxes to proceed with booking.");
      return;
    }
    if (!validateStep(5)) {
      setCurrentStep(5);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create order on backend
      const res = await fetch("/api/project-applications/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          projectType: currentProjectTypeObj.name,
          termsAccepted: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create payment order.");
      }

      const { orderId, amount, keyId, referenceId, applicationId, isMock } = data;

      // 2. If sandbox test simulation mode
      if (isMock || !window.Razorpay) {
        const verifyRes = await fetch("/api/project-applications/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentId: `pay_sim_${Date.now()}`,
            signature: "simulated_valid_signature",
            referenceId,
            applicationId,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          router.push(`/project-request/success/${referenceId}`);
          return;
        } else {
          throw new Error(verifyData.error || "Verification failed");
        }
      }

      // 3. Trigger Razorpay Standard Checkout
      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "CodeXa Agency",
        description: `Advance Deposit: ${currentProjectTypeObj.name} (${referenceId})`,
        image: "/assets/images/logo.jpeg",
        order_id: orderId,
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#ff1838",
          backdrop_color: "#050505",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/project-applications/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                referenceId,
                applicationId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              router.push(`/project-request/success/${referenceId}`);
            } else {
              setErrorMessage(verifyData.error || "Payment verification failed. Please contact support.");
            }
          } catch {
            setErrorMessage("Error verifying payment transaction. Reference ID: " + referenceId);
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setErrorMessage("Payment was not completed. Your project requirements remain saved.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setErrorMessage(`Payment failed: ${response.error?.description || "Transaction declined"}. Requirements saved.`);
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Order error:", err);
      setErrorMessage(err?.message || "Failed to process application. Please try again.");
      setIsSubmitting(false);
    }
  };

  /* ───────────────────────── live blueprint for the 3D builder ───────────────────────── */

  const blueprint: Blueprint = useMemo(() => {
    const kind: BuildKind =
      formData.projectType === "mobile-application" ? "mobile" : formData.projectType === "ai-platform" ? "ai" : PLATFORM_TYPES.has(formData.projectType) ? "platform" : "web";
    const mods: BuildModule[] = [];
    const add = (id: string, label: string, shape: BuildModule["shape"]) => {
      if (!mods.some((m) => m.id === id)) mods.push({ id, label, shape });
    };
    if (formData.authOption !== "No Login Required") add("auth", "Secure login", "ring");
    if (formData.authExtras.includes("Two-Factor Authentication") && formData.authOption !== "No Login Required") add("2fa", "2-step verification", "shield");
    if (formData.authExtras.includes("Role-Based Access") && formData.authOption !== "No Login Required") add("roles", "Role-based access", "shield");
    if (formData.databaseOption === "Yes") add("db", "Cloud database", "db");
    if (formData.dashboardOption !== "No Dashboard") add("dash", formData.dashboardOption, "panel");
    FEATURE_OPTIONS.forEach((f) => formData.features.includes(f.id) && add(f.id, f.name, f.shape));
    if (formData.purposes.includes("Provide AI Features")) add("ai_integration", "AI agents & LLMs", "ai");
    formData.integrations.slice(0, 6).forEach((i) => add(`int-${i}`, i, "satellite"));
    const accent = DESIGN_STYLES.find((s) => s.id === formData.designStyles[0])?.color || "#FF1E3C";
    return {
      kind,
      pages: pagesFrom(formData.pageRange),
      accent,
      motion: ["Minimal", "Standard", "Advanced", "Cinematic"].indexOf(formData.animationLevel),
      modules: mods,
      step: currentStep,
      ready: currentStep === 6,
    };
  }, [formData, currentStep]);

  const progressPct = Math.round(((maxVisited - 1) / 5) * 100);

  return (
    <PageShell>
      {/* Razorpay Checkout SDK Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />

      {/* ── Intro ── */}
      <section className="relative pt-32 sm:pt-40 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="flex items-center gap-3 mb-5">
          <span className="h-px w-10 bg-bright-red" />
          <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">Project builder</span>
        </motion.div>
        <h1 className="font-orbitron font-black uppercase text-white tracking-tight leading-[0.92] text-[11vw] sm:text-6xl lg:text-7xl" style={{ perspective: 900 }}>
          {["Build", "your", "project"].map((w, i) => (
            <span key={w} className="inline-block overflow-hidden align-bottom mr-[0.25em] pb-1">
              <motion.span
                className={`inline-block ${w === "project" ? "text-transparent [-webkit-text-stroke:1.5px_#FF1E3C]" : ""}`}
                initial={{ y: "110%", rotateX: -80, opacity: 0 }}
                animate={{ y: "0%", rotateX: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: EASE }}
                style={{ transformOrigin: "50% 100%" }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35, ease: EASE }} className="mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed">
          Choose what you need and watch your product assemble in 3D. Your booking deposit is calculated and shown only at the final step.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
          {[
            { i: Box, t: "Configure", d: "Pick type, features & stack" },
            { i: Eye, t: "Preview", d: "See it build live in 3D" },
            { i: Lock, t: "Book", d: "Review & secure your slot" },
          ].map((s, k) => (
            <div key={s.t} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <span className="w-9 h-9 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center shrink-0">
                <s.i className="w-4 h-4 text-bright-red" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  <span className="font-mono text-bright-red mr-1.5">0{k + 1}</span>
                  {s.t}
                </span>
                <span className="block text-xs text-white/45">{s.d}</span>
              </span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Sticky stepper ── */}
      <div id="builder" className="scroll-mt-16" />
      <div className="sticky top-[60px] z-30 bg-[#050505]/85 backdrop-blur-xl border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center gap-1 sm:gap-2 py-3 overflow-x-auto [scrollbar-width:none]" aria-label="Builder steps">
            {STEPS.map((s, i) => {
              const done = s.id < currentStep;
              const on = s.id === currentStep;
              const reachable = s.id <= maxVisited;
              const Icon = s.icon;
              return (
                <li key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!reachable && s.id !== currentStep + 1}
                    onClick={() => {
                      if (s.id <= maxVisited || validateStep(currentStep)) goTo(s.id);
                    }}
                    className={`relative flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-xs transition ${
                      on ? "bg-crimson text-white shadow-[0_0_20px_rgba(217,4,41,0.45)]" : done ? "text-white/80 hover:bg-white/[0.05]" : "text-white/35 disabled:cursor-not-allowed"
                    }`}
                    aria-current={on ? "step" : undefined}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center ${on ? "bg-white/20" : done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.05]"}`}>
                      {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </span>
                    <span className="font-semibold">
                      <span className="sm:hidden">{s.short}</span>
                      <span className="hidden sm:inline">{s.title}</span>
                    </span>
                  </button>
                  {i < STEPS.length - 1 && <span className={`w-4 sm:w-8 h-px ${done ? "bg-emerald-500/50" : "bg-white/10"}`} />}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="h-[2px] bg-white/[0.05]">
          <motion.div className="h-full bg-gradient-to-r from-crimson via-bright-red to-emerald-400" animate={{ width: `${(currentStep / 6) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>
      </div>

      {/* ── Builder ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] items-start">
        {/* 3D preview + blueprint (first on mobile) */}
        <aside className="lg:order-2 lg:sticky lg:top-[132px] space-y-4">
          <div className="relative h-[240px] sm:h-[380px] rounded-[28px] overflow-hidden border border-white/[0.08] bg-[radial-gradient(70%_70%_at_50%_40%,rgba(217,4,41,0.14),rgba(8,8,10,0.95))]">
            <ProjectBuilderScene blueprint={blueprint} />
            <div className="pointer-events-none absolute top-4 left-4 right-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-bright-red animate-pulse" /> Live build
              </span>
              <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 font-mono text-[10px] text-white/70">
                {blueprint.modules.length} modules · {blueprint.pages} {blueprint.pages === 1 ? "layer" : "layers"}
              </span>
            </div>
            <AnimatePresence>
              {currentStep === 6 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute bottom-4 inset-x-4 flex justify-center">
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Blueprint assembled
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:block">
          <BlueprintCard
            typeName={formData.projectType === "custom-other" && formData.customProjectType ? formData.customProjectType : currentProjectTypeObj.name}
            typeIcon={TYPE_ICONS[formData.projectType] || Box}
            timeline={currentStep >= 5 ? formData.timeline : currentProjectTypeObj.recommendedTimeline}
            modules={blueprint.modules}
            styles={formData.designStyles}
            motionLevel={formData.animationLevel}
            pages={formData.pageRange}
            progress={progressPct}
          />
          </div>
        </aside>

        {/* Steps */}
        <div className="lg:order-1 min-w-0">
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <motion.div animate={{ x: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.4 }} className="p-4 rounded-2xl border border-bright-red/50 bg-crimson/10 flex items-center gap-3 text-sm text-white" role="alert">
                  <AlertCircle className="w-5 h-5 text-bright-red shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                  <button onClick={() => setErrorMessage(null)} className="text-white/50 hover:text-white" aria-label="Dismiss">
                    ✕
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ perspective: 1600 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, rotateY: -14, x: 60, filter: "blur(8px)" }}
                animate={{ opacity: 1, rotateY: 0, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, rotateY: 14, x: -60, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: EASE }}
                className="space-y-6"
              >
                {/* ── STEP 1 ── */}
                {currentStep === 1 && (
                  <>
                    <StepHeader n={1} title="What do you want to build?" text="Pick the closest category — it decides the core shape of your product." />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PROJECT_TYPES.map((pt, i) => {
                        const Icon = TYPE_ICONS[pt.id] || Box;
                        const on = formData.projectType === pt.id;
                        return (
                          <Tile key={pt.id} i={i} on={on} onClick={() => set("projectType", pt.id)}>
                            <div className="flex items-start gap-3">
                              <IconBadge icon={Icon} on={on} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-semibold text-white truncate">{pt.name}</h3>
                                  {pt.badge && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-crimson text-[10px] font-semibold text-white">{pt.badge}</span>}
                                </div>
                                <p className="mt-1 text-xs text-white/50 leading-relaxed line-clamp-2">{pt.description}</p>
                                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/35">
                                  {pt.category} · {pt.recommendedTimeline}
                                </p>
                              </div>
                            </div>
                          </Tile>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {formData.projectType === "custom-other" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <Section title="Tell us about your idea" icon={Wrench}>
                            <Field label="Describe your custom project *">
                              <input
                                type="text"
                                value={formData.customProjectType}
                                onChange={(e) => set("customProjectType", e.target.value)}
                                placeholder="e.g. AI financial sentiment analyser with a Discord alert bot"
                                className={inputCls}
                              />
                            </Field>
                            <Field label="Closest system category">
                              <div className="flex flex-wrap gap-2">
                                {["Website", "Web Application", "Mobile Application", "Desktop Application", "AI System", "Automation", "SaaS", "Developer Tool", "Internal Business Tool", "Other"].map((cat) => (
                                  <Chip key={cat} on={formData.closestCategory === cat} onClick={() => set("closestCategory", cat)}>
                                    {cat}
                                  </Chip>
                                ))}
                              </div>
                            </Field>
                          </Section>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

                {/* ── STEP 2 ── */}
                {currentStep === 2 && (
                  <>
                    <StepHeader n={2} title="Goals & features" text="What should it achieve? Every feature you add docks into the 3D build." />
                    <Section title="Primary goals" icon={Rocket} hint="Select all that apply">
                      <div className="flex flex-wrap gap-2">
                        {PURPOSE_OPTIONS.map((p) => (
                          <Chip key={p} on={formData.purposes.includes(p)} onClick={() => toggleArrayItem("purposes", p)}>
                            {p}
                          </Chip>
                        ))}
                      </div>
                    </Section>
                    <Section title={`${currentProjectTypeObj.name} features`} icon={Zap} hint="Responsive design is always included">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {FEATURE_OPTIONS.map((f, i) => {
                          const on = formData.features.includes(f.id);
                          return (
                            <Tile key={f.id} i={i} on={on} onClick={() => toggleArrayItem("features", f.id)} compact>
                              <div className="flex items-center gap-3">
                                <IconBadge icon={f.icon} on={on} small />
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-white">{f.name}</h4>
                                  <p className="text-xs text-white/45">{f.desc}</p>
                                </div>
                                <CheckDot on={on} />
                              </div>
                            </Tile>
                          );
                        })}
                      </div>
                    </Section>
                  </>
                )}

                {/* ── STEP 3 ── */}
                {currentStep === 3 && (
                  <>
                    <StepHeader n={3} title="Tech stack" text="Accounts, data, dashboards and the services your product connects to." />
                    <Section title="User accounts & login" icon={Key}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["No Login Required", "Email + Password", "Google Login", "Phone OTP", "Email OTP", "Multiple Login Methods"].map((opt) => (
                          <Option key={opt} on={formData.authOption === opt} onClick={() => set("authOption", opt)}>
                            {opt}
                          </Option>
                        ))}
                      </div>
                      <AnimatePresence>
                        {formData.authOption !== "No Login Required" && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <p className="mt-4 mb-2 text-xs font-semibold text-white/55">Security add-ons</p>
                            <div className="flex flex-wrap gap-2">
                              {["Forgot Password", "Email Verification", "Two-Factor Authentication", "Role-Based Access", "Active Sessions Tracker"].map((x) => (
                                <Chip key={x} on={formData.authExtras.includes(x)} onClick={() => toggleArrayItem("authExtras", x)}>
                                  {x}
                                </Chip>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Section>
                    <Section title="Dashboard & control center" icon={LayoutDashboard}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["No Dashboard", "User Dashboard", "Admin Dashboard", "User + Admin Dashboard", "Multi-role Dashboard"].map((d) => (
                          <Option key={d} on={formData.dashboardOption === d} onClick={() => set("dashboardOption", d)}>
                            {d}
                          </Option>
                        ))}
                      </div>
                    </Section>
                    <Section title="Database" icon={Database} hint="Supabase / PostgreSQL">
                      <div className="grid grid-cols-3 gap-2">
                        {["No", "Yes", "Not Sure"].map((d) => (
                          <Option key={d} on={formData.databaseOption === d} onClick={() => set("databaseOption", d)}>
                            {d}
                          </Option>
                        ))}
                      </div>
                    </Section>
                    <Section title="Integrations" icon={Globe} hint="Third-party services">
                      <div className="flex flex-wrap gap-2">
                        {INTEGRATION_OPTIONS.map((x) => (
                          <Chip key={x} on={formData.integrations.includes(x)} onClick={() => toggleArrayItem("integrations", x)}>
                            {x}
                          </Chip>
                        ))}
                      </div>
                    </Section>
                  </>
                )}

                {/* ── STEP 4 ── */}
                {currentStep === 4 && (
                  <>
                    <StepHeader n={4} title="Design & scope" text="Your first style sets the colour of the 3D build. Page count adds layers." />
                    <Section title="Visual style" icon={Palette} hint="Select one or more">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {DESIGN_STYLES.map((s, i) => {
                          const on = formData.designStyles.includes(s.id);
                          const primary = formData.designStyles[0] === s.id;
                          return (
                            <Tile key={s.id} i={i} on={on} onClick={() => toggleArrayItem("designStyles", s.id)} compact>
                              <div className="h-12 rounded-xl mb-3 border border-white/10 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.color}55, #0b0b0e 70%)` }}>
                                <span className="absolute bottom-2 left-2 w-6 h-1.5 rounded-full" style={{ background: s.color }} />
                                <span className="absolute bottom-2 left-10 w-10 h-1.5 rounded-full bg-white/20" />
                                {primary && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white">Primary</span>}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-white truncate">{s.label}</h4>
                                <CheckDot on={on} />
                              </div>
                              <p className="text-xs text-white/45">{s.desc}</p>
                            </Tile>
                          );
                        })}
                      </div>
                    </Section>
                    <Section title="Animation & motion" icon={Sparkles}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "Minimal", desc: "Subtle fades" },
                          { id: "Standard", desc: "Smooth cards & scroll" },
                          { id: "Advanced", desc: "Parallax & micro-FX" },
                          { id: "Cinematic", desc: "3D & WebGL" },
                        ].map((a) => (
                          <Option key={a.id} on={formData.animationLevel === a.id} onClick={() => set("animationLevel", a.id)}>
                            <span className="block font-semibold">{a.id}</span>
                            <span className="block text-[11px] opacity-60">{a.desc}</span>
                          </Option>
                        ))}
                      </div>
                    </Section>
                    <Section title="Size of the project" icon={Layers}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["1 Page (Single Landing)", "2–5 Pages", "6–10 Pages", "11–20 Pages", "20+ Pages", "Dynamic Web Application"].map((p) => (
                          <Option key={p} on={formData.pageRange === p} onClick={() => set("pageRange", p)}>
                            {p}
                          </Option>
                        ))}
                      </div>
                    </Section>
                    <Section title="Existing design" icon={Eye}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {["No — CodeXa should design everything", "Yes — Figma Link Available", "Yes — Reference Websites", "Yes — Screenshot / Wireframes"].map((d) => (
                          <Option key={d} on={formData.hasExistingDesign === d} onClick={() => set("hasExistingDesign", d)}>
                            {d}
                          </Option>
                        ))}
                      </div>
                      <AnimatePresence>
                        {formData.hasExistingDesign !== "No — CodeXa should design everything" && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <input type="url" value={formData.designLinks} onChange={(e) => set("designLinks", e.target.value)} placeholder="Paste Figma / reference URLs" className={`${inputCls} mt-3`} aria-label="Design links" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Section>
                  </>
                )}

                {/* ── STEP 5 ── */}
                {currentStep === 5 && (
                  <>
                    <StepHeader n={5} title="Timeline & contact" text="When do you need it, and how can we reach you?" />
                    <Section title="Target delivery" icon={Clock}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["Urgent (< 1 Week)", "1–2 Weeks", "2–4 Weeks", "1–2 Months", "Flexible Timeline"].map((t) => (
                          <Option key={t} on={formData.timeline === t} onClick={() => set("timeline", t)}>
                            {t}
                          </Option>
                        ))}
                      </div>
                    </Section>
                    <Section title="Your overall budget" icon={Briefcase} hint="Helps us propose the right scope">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {["Below ₹10,000", "₹10,000–₹20,000", "₹20,000–₹40,000", "₹40,000–₹75,000", "₹75,000+", "Need CodeXa Recommendation"].map((b) => (
                          <Option key={b} on={formData.budgetRange === b} onClick={() => set("budgetRange", b)}>
                            {b}
                          </Option>
                        ))}
                      </div>
                    </Section>
                    <Section title="Contact details" icon={User}>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Full name *" htmlFor="pr-name">
                          <input id="pr-name" type="text" autoComplete="name" value={formData.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Arjun Kumar" className={inputCls} />
                        </Field>
                        <Field label="Email address *" htmlFor="pr-email">
                          <input id="pr-email" type="email" autoComplete="email" value={formData.email} onChange={(e) => set("email", e.target.value)} placeholder="e.g. arjun@startup.com" className={inputCls} />
                        </Field>
                        <Field label="Phone / WhatsApp *" htmlFor="pr-phone">
                          <input id="pr-phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. +91 98765 43210" className={inputCls} />
                        </Field>
                        <Field label="Company / brand" htmlFor="pr-company">
                          <input id="pr-company" type="text" autoComplete="organization" value={formData.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Nova Studios" className={inputCls} />
                        </Field>
                        <Field label="Preferred contact" htmlFor="pr-contact">
                          <select id="pr-contact" value={formData.preferredContact} onChange={(e) => set("preferredContact", e.target.value)} className={inputCls}>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="Phone">Phone call</option>
                          </select>
                        </Field>
                        <Field label="City" htmlFor="pr-city">
                          <input id="pr-city" type="text" autoComplete="address-level2" value={formData.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Hyderabad" className={inputCls} />
                        </Field>
                      </div>
                      <Field
                        label="Tell us about your idea *"
                        htmlFor="pr-desc"
                        right={
                          <span className={`font-mono text-[11px] ${formData.description.trim().length >= 20 ? "text-emerald-400" : "text-white/40"}`}>
                            {formData.description.trim().length}/20 min
                          </span>
                        }
                      >
                        <textarea id="pr-desc" rows={5} value={formData.description} onChange={(e) => set("description", e.target.value)} placeholder="What should it do? Who uses it? Any must-have features or references?" className={`${inputCls} resize-none leading-relaxed`} />
                      </Field>
                    </Section>
                  </>
                )}

                {/* ── STEP 6 ── */}
                {currentStep === 6 && (
                  <>
                    <StepHeader n={6} title="Review & book" text="Your blueprint is assembled. Check the details, then reserve your build slot." />
                    <Section title="Project summary" icon={FileText}>
                      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { k: "Project", v: currentProjectTypeObj.name },
                          { k: "Timeline", v: formData.timeline },
                          { k: "Your budget", v: formData.budgetRange },
                          { k: "Client", v: formData.fullName || "—" },
                        ].map((d) => (
                          <div key={d.k} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
                            <dt className="font-mono text-[10px] uppercase tracking-widest text-white/40">{d.k}</dt>
                            <dd className="mt-1 text-sm font-semibold text-white">{d.v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {blueprint.modules.map((m, i) => (
                          <motion.span key={m.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/75">
                            <Check className="w-3 h-3 text-emerald-400" /> {m.label}
                          </motion.span>
                        ))}
                      </div>
                    </Section>

                    <DepositReveal result={advanceResult} />

                    <Section title="Confirm & agree" icon={Shield}>
                      <div className="space-y-3">
                        <Terms checked={formData.termsInfoCorrect} onChange={(v) => set("termsInfoCorrect", v)}>
                          The information I provided is correct and represents my project goals.
                        </Terms>
                        <Terms checked={formData.termsAdvanceUnderstood} onChange={(v) => set("termsAdvanceUnderstood", v)}>
                          I understand this ₹{advanceResult.finalAdvance.toLocaleString("en-IN")} is an <strong className="text-white">advance / booking payment</strong>, not the full project price.
                        </Terms>
                        <Terms checked={formData.termsReviewUnderstood} onChange={(v) => set("termsReviewUnderstood", v)}>
                          The final scope, milestones and total quotation are confirmed after CodeXa&apos;s technical review.
                        </Terms>
                        <Terms checked={formData.termsPolicyAccepted} onChange={(v) => set("termsPolicyAccepted", v)}>
                          I agree to the{" "}
                          <Link href="/payment-policy" target="_blank" className="text-bright-red underline hover:text-white">
                            booking advance & refund policy
                          </Link>
                          .
                        </Terms>
                      </div>
                    </Section>

                    <motion.button
                      type="button"
                      onClick={handleInitiatePayment}
                      disabled={!allTermsAccepted || isSubmitting}
                      whileHover={allTermsAccepted && !isSubmitting ? { y: -2 } : undefined}
                      whileTap={{ scale: 0.98 }}
                      className="group relative w-full overflow-hidden rounded-2xl py-4 px-6 bg-gradient-to-r from-crimson to-bright-red text-white font-semibold flex items-center justify-center gap-3 shadow-[0_20px_50px_-20px_rgba(217,4,41,0.9)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-enabled:group-hover:translate-x-full transition-transform duration-700" />
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Securing your slot…
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" /> Pay ₹{advanceResult.finalAdvance.toLocaleString("en-IN")} & book my project
                        </>
                      )}
                    </motion.button>
                    {!allTermsAccepted && <p className="text-center text-xs text-white/40">Tick all four boxes above to enable payment.</p>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="hidden lg:flex items-center justify-between pt-8 mt-8 border-t border-white/[0.06]">
            {currentStep > 1 ? (
              <button type="button" onClick={handlePrevStep} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/30 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <span />
            )}
            {currentStep < 6 && (
              <motion.button type="button" onClick={handleNextStep} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-crimson hover:bg-bright-red text-sm font-semibold text-white shadow-[0_10px_40px_-12px_rgba(217,4,41,0.8)] transition-colors">
                {currentStep === 5 ? "Review my blueprint" : `Continue to ${STEPS[currentStep].title.toLowerCase()}`} <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/55">
            Need something custom? Talk to us on{" "}
            <a href="https://wa.me/918897901413" target="_blank" rel="noopener noreferrer" className="text-bright-red hover:text-white">
              WhatsApp
            </a>{" "}
            before you book.
          </div>
        </div>
      </section>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#070707]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3">
        {currentStep > 1 && (
          <button type="button" onClick={handlePrevStep} className="p-3 rounded-xl border border-white/10 text-white/70" aria-label="Previous step">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {currentStep === 6 ? (
            <>
              <span className="block text-[10px] uppercase tracking-widest text-white/40">Booking deposit</span>
              <span className="font-mono text-lg font-bold text-bright-red">₹{advanceResult.finalAdvance.toLocaleString("en-IN")}</span>
            </>
          ) : (
            <>
              <span className="block text-[10px] uppercase tracking-widest text-white/40">Step {currentStep} of 6</span>
              <span className="block text-sm font-semibold text-white truncate">{STEPS[currentStep - 1].title}</span>
            </>
          )}
        </div>
        {currentStep < 6 ? (
          <button type="button" onClick={handleNextStep} className="px-5 py-3 rounded-xl bg-crimson text-white text-sm font-semibold">
            Continue
          </button>
        ) : (
          <button type="button" onClick={handleInitiatePayment} disabled={!allTermsAccepted || isSubmitting} className="px-5 py-3 rounded-xl bg-gradient-to-r from-crimson to-bright-red text-white text-sm font-semibold disabled:opacity-40">
            {isSubmitting ? "Processing…" : "Pay & book"}
          </button>
        )}
      </div>
      <div className="h-20 lg:hidden" />
    </PageShell>
  );
}

/* ───────────────────────── UI pieces ───────────────────────── */

const inputCls =
  "w-full rounded-2xl bg-white/[0.03] border border-white/10 focus:border-bright-red focus:shadow-[0_0_0_4px_rgba(217,4,41,0.15)] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition";

function StepHeader({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-bright-red">Step {n} of 6</div>
      <h2 className="mt-2 font-orbitron font-black text-2xl sm:text-3xl text-white tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-white/55">{text}</p>
    </div>
  );
}

function Section({ title, icon: Icon, hint, children }: { title: string; icon: LucideIcon; hint?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30, rotateX: 10 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ duration: 0.7, ease: EASE }}
      style={{ transformPerspective: 1200 }}
      className="rounded-[24px] border border-white/[0.08] bg-[#0a0a0c]/80 backdrop-blur-md p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="w-8 h-8 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center">
            <Icon className="w-4 h-4 text-bright-red" />
          </span>
          {title}
        </h3>
        {hint && <span className="text-xs text-white/40 text-right">{hint}</span>}
      </div>
      {children}
    </motion.section>
  );
}

function Tile({ on, onClick, children, i = 0, compact }: { on: boolean; onClick: () => void; children: React.ReactNode; i?: number; compact?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      initial={{ opacity: 0, y: 24, rotateX: -20 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: Math.min(i, 10) * 0.035, ease: EASE }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      style={{ transformPerspective: 900 }}
      className={`relative w-full text-left rounded-2xl border ${compact ? "p-3.5" : "p-4"} transition-colors ${
        on ? "border-bright-red/70 bg-gradient-to-br from-crimson/20 to-transparent shadow-[0_0_30px_-8px_rgba(217,4,41,0.6)]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bright-red flex items-center justify-center shadow-[0_0_12px_rgba(255,30,60,0.8)]"><Check className="w-3 h-3 text-white" /></motion.span>}
      {children}
    </motion.button>
  );
}

function IconBadge({ icon: Icon, on, small }: { icon: LucideIcon; on: boolean; small?: boolean }) {
  return (
    <span className={`${small ? "w-9 h-9" : "w-11 h-11"} shrink-0 rounded-xl flex items-center justify-center border transition-colors ${on ? "bg-crimson border-bright-red" : "bg-white/[0.04] border-white/10"}`}>
      <Icon className={`${small ? "w-4 h-4" : "w-5 h-5"} ${on ? "text-white" : "text-bright-red"}`} />
    </span>
  );
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <span className={`ml-auto shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition ${on ? "bg-bright-red border-bright-red" : "border-white/20"}`}>
      {on && <Check className="w-3 h-3 text-white" />}
    </span>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs transition ${on ? "bg-crimson/20 border-bright-red/70 text-white" : "border-white/10 text-white/60 hover:text-white hover:border-white/25"}`}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
            <Check className="w-3 h-3 text-bright-red" />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      whileTap={{ scale: 0.97 }}
      className={`relative w-full text-left rounded-xl border px-3.5 py-3 text-xs transition ${on ? "bg-crimson/15 border-bright-red/70 text-white shadow-[0_0_20px_-8px_rgba(217,4,41,0.7)]" : "border-white/10 bg-white/[0.02] text-white/65 hover:text-white hover:border-white/25"}`}
    >
      {children}
    </motion.button>
  );
}

function Field({ label, htmlFor, right, children }: { label: string; htmlFor?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={htmlFor} className="text-xs font-semibold text-white/60">
          {label}
        </label>
        {right}
      </div>
      {children}
    </div>
  );
}

function Terms({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${checked ? "border-emerald-400/40 bg-emerald-500/[0.06]" : "border-white/[0.08] hover:border-white/20"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <motion.span
        animate={{ scale: checked ? [1, 1.25, 1] : 1 }}
        transition={{ duration: 0.3 }}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-bright-red ${checked ? "bg-emerald-500 border-emerald-400" : "border-white/25"}`}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
      </motion.span>
      <span className="text-sm text-white/70 leading-relaxed">{children}</span>
    </label>
  );
}

function BlueprintCard({
  typeName, typeIcon: TypeIcon, timeline, modules, styles, motionLevel, pages, progress,
}: {
  typeName: string;
  typeIcon: LucideIcon;
  timeline: string;
  modules: BuildModule[];
  styles: string[];
  motionLevel: string;
  pages: string;
  progress: number;
}) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-[#0a0a0c]/85 backdrop-blur-md p-5">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-crimson/15 border border-crimson/30 flex items-center justify-center">
          <TypeIcon className="w-5 h-5 text-bright-red" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Your blueprint</p>
          <AnimatePresence mode="wait">
            <motion.p key={typeName} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm font-semibold text-white truncate">
              {typeName}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="relative w-14 h-14 shrink-0" aria-label={`Builder ${progress}% complete`}>
          <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
            <circle cx="28" cy="28" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
            <motion.circle cx="28" cy="28" r={r} stroke="#FF1E3C" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c - (c * progress) / 100 }} transition={{ duration: 0.8, ease: EASE }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">{progress}%</span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { k: "Timeline", v: timeline },
          { k: "Size", v: pages.replace(" (Single Landing)", "") },
          { k: "Motion", v: motionLevel },
        ].map((d) => (
          <div key={d.k} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-2 py-2">
            <dt className="font-mono text-[9px] uppercase tracking-widest text-white/35">{d.k}</dt>
            <dd className="mt-0.5 text-xs font-semibold text-white truncate">{d.v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Modules docked · {modules.length}</p>
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1" data-lenis-prevent>
        <AnimatePresence initial={false}>
          {modules.map((m) => (
            <motion.span
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.6, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/75"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-bright-red" /> {m.label}
            </motion.span>
          ))}
        </AnimatePresence>
        {modules.length === 0 && <span className="text-xs text-white/35">Add features to see modules dock in.</span>}
      </div>

      {styles.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Style</span>
          <div className="flex -space-x-1.5">
            {styles.slice(0, 5).map((s) => (
              <span key={s} title={s} className="w-5 h-5 rounded-full border-2 border-[#0a0a0c]" style={{ background: DESIGN_STYLES.find((d) => d.id === s)?.color }} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 pt-4 border-t border-white/[0.06] text-xs text-white/40 flex items-center gap-2">
        <Lock className="w-3.5 h-3.5" /> Your booking deposit is shown at the final step.
      </p>
    </div>
  );
}

/** Animated deposit reveal — only rendered on the final step. */
function DepositReveal({ result }: { result: ReturnType<typeof calculateProjectAdvance> }) {
  const [shown, setShown] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const target = result.finalAdvance;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 4))));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [result.finalAdvance]);

  return (
    <motion.section
      initial={{ opacity: 0, rotateX: 25, y: 40 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
      style={{ transformPerspective: 1200 }}
      className="relative overflow-hidden rounded-[28px] border border-bright-red/40 bg-gradient-to-br from-crimson/20 via-[#0b0b0d] to-[#080808] p-6 sm:p-8"
    >
      <motion.div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-crimson/30 blur-[90px]" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />
      <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">Booking deposit</p>
          <p className="mt-2 font-orbitron font-black text-5xl sm:text-6xl text-white tabular-nums">₹{shown.toLocaleString("en-IN")}</p>
          <p className="mt-2 text-sm text-white/55 max-w-sm">Reserves your build slot and covers the technical architecture review. It&apos;s credited toward your final quotation.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Shield className="w-4 h-4 text-emerald-400" /> Secured by Razorpay
        </div>
      </div>
      <div className="relative mt-6 rounded-2xl bg-black/30 border border-white/[0.06] divide-y divide-white/[0.05]">
        {result.breakdown.map((b, i) => (
          <motion.div key={b.label + i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.06 }} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-white/65 truncate pr-3">{b.label}</span>
            <span className="font-mono text-white shrink-0">₹{b.amount.toLocaleString("en-IN")}</span>
          </motion.div>
        ))}
        {(result.isMaxCapped || result.isMinCapped) && (
          <div className="px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between">
            <span>{result.isMaxCapped ? "Deposit is capped at ₹7,000" : "Minimum deposit is ₹2,000"}</span>
            <span className="font-mono">= ₹{result.finalAdvance.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>
    </motion.section>
  );
}
