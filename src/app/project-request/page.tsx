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

  // Section currently in view (scroll-driven) and the furthest section reached
  const [currentStep, setCurrentStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);
  // The deposit is only rendered after the client reaches the review section
  const [revealPhase, setRevealPhase] = useState<"idle" | "compiling" | "revealed">("idle");

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

  const scrollToStep = (step: number) => scrollToId(`step-${step}`);

  // Scroll-driven: whichever section sits in the middle of the viewport is the active step
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const n = Number((e.target as HTMLElement).dataset.step);
          setCurrentStep(n);
          setMaxVisited((m) => Math.max(m, n));
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    STEPS.forEach((s) => {
      const el = document.getElementById(`step-${s.id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Reaching the review section "compiles" the blueprint, then reveals the deposit
  useEffect(() => {
    if (currentStep === 6 && revealPhase === "idle") setRevealPhase("compiling");
  }, [currentStep, revealPhase]);

  useEffect(() => {
    if (revealPhase !== "compiling") return;
    const t = setTimeout(() => setRevealPhase("revealed"), 2200);
    return () => clearTimeout(t);
  }, [revealPhase]);

  // Everything required before booking, with the section that fixes it
  const missing = [
    formData.projectType === "custom-other" && !formData.customProjectType.trim() ? { label: "Describe your custom project", step: 1 } : null,
    formData.purposes.length === 0 ? { label: "Choose at least one goal", step: 2 } : null,
    !formData.fullName.trim() ? { label: "Your full name", step: 5 } : null,
    !formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email) ? { label: "A valid email address", step: 5 } : null,
    !formData.phone.trim() || formData.phone.trim().length < 8 ? { label: "Phone / WhatsApp number", step: 5 } : null,
    formData.description.trim().length < 20 ? { label: "Project description (20+ characters)", step: 5 } : null,
  ].filter(Boolean) as { label: string; step: number }[];

  // Check if all 4 terms are checked
  const allTermsAccepted =
    formData.termsInfoCorrect && formData.termsAdvanceUnderstood && formData.termsReviewUnderstood && formData.termsPolicyAccepted;

  // Handle Payment & Order Creation
  const handleInitiatePayment = async () => {
    if (!allTermsAccepted) {
      setErrorMessage("Please accept all terms checkboxes to proceed with booking.");
      return;
    }
    for (const s of [1, 2, 5]) {
      if (!validateStep(s)) {
        scrollToStep(s);
        return;
      }
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

      {/* ── Sticky stepper (follows the scroll) ── */}
      <div id="builder" className="scroll-mt-16" />
      <div className="sticky top-[60px] z-30 bg-[#050505]/85 backdrop-blur-xl border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center gap-1 sm:gap-2 py-3 overflow-x-auto [scrollbar-width:none]" aria-label="Builder steps">
            {STEPS.map((s, i) => {
              const done = s.id < currentStep;
              const on = s.id === currentStep;
              const Icon = s.icon;
              return (
                <li key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollToStep(s.id)}
                    className={`relative flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-xs transition ${
                      on ? "bg-crimson text-white shadow-[0_0_20px_rgba(217,4,41,0.45)]" : done ? "text-white/80 hover:bg-white/[0.05]" : "text-white/40 hover:text-white/70"
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

      {/* ── Scroll story: sections on the left, live 3D build pinned on the right ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,44%)] items-start">
        {/* 3D build (sticky) */}
        <aside className="lg:order-2 lg:sticky lg:top-[118px] z-20 pt-6 lg:pt-8">
          <div className="relative h-[260px] sm:h-[340px] lg:h-[calc(100vh-170px)] rounded-[28px] overflow-hidden border border-white/[0.08] bg-[radial-gradient(70%_70%_at_50%_40%,rgba(217,4,41,0.14),rgba(8,8,10,0.97))] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
            <ProjectBuilderScene blueprint={blueprint} />
            <BuildHud
              typeName={formData.projectType === "custom-other" && formData.customProjectType ? formData.customProjectType : currentProjectTypeObj.name}
              category={currentProjectTypeObj.category}
              typeIcon={TYPE_ICONS[formData.projectType] || Box}
              timeline={maxVisited >= 5 ? formData.timeline : currentProjectTypeObj.recommendedTimeline}
              size={formData.pageRange.replace(" (Single Landing)", "")}
              motionLevel={formData.animationLevel}
              styles={formData.designStyles}
              moduleCount={blueprint.modules.length}
              progress={progressPct}
              stepTitle={STEPS[currentStep - 1].title}
              assembled={currentStep === 6}
            />
          </div>
        </aside>

        {/* Sections */}
        <div className="lg:order-1 min-w-0 pb-10">
          <AnimatePresence>
            {errorMessage && (
              <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sticky top-[132px] z-10 pt-4 overflow-hidden">
                <motion.div animate={{ x: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.4 }} className="p-4 rounded-2xl border border-bright-red/50 bg-[#1a0508]/95 backdrop-blur flex items-center gap-3 text-sm text-white" role="alert">
                  <AlertCircle className="w-5 h-5 text-bright-red shrink-0" />
                  <span className="flex-1">{errorMessage}</span>
                  <button onClick={() => setErrorMessage(null)} className="text-white/50 hover:text-white" aria-label="Dismiss">
                    ✕
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── STEP 1 ── */}
          <StorySection n={1} title="What do you want to build?" text="Pick the closest category — it decides the core shape of your product." next="Goals & features" onNext={() => scrollToStep(2)}>
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
                    <Field label="Describe your custom project *" htmlFor="pr-custom">
                      <input id="pr-custom" type="text" value={formData.customProjectType} onChange={(e) => set("customProjectType", e.target.value)} placeholder="e.g. AI financial sentiment analyser with a Discord alert bot" className={inputCls} />
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
          </StorySection>

          {/* ── STEP 2 ── */}
          <StorySection n={2} title="Goals & features" text="What should it achieve? Every feature you add docks into the 3D build with its label." next="Tech stack" onNext={() => scrollToStep(3)}>
            <Section title="Primary goals" icon={Rocket} hint="Select all that apply">
              <div className="flex flex-wrap gap-2">
                {PURPOSE_OPTIONS.map((p) => (
                  <Chip key={p} on={formData.purposes.includes(p)} onClick={() => toggleArrayItem("purposes", p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </Section>
            <Section title={`${currentProjectTypeObj.name} features`} icon={Zap} hint="Responsive design always included">
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
          </StorySection>

          {/* ── STEP 3 ── */}
          <StorySection n={3} title="Tech stack" text="Accounts, data, dashboards and the services your product connects to." next="Design & scope" onNext={() => scrollToStep(4)}>
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
            <Section title="Integrations" icon={Globe} hint="Orbit the build as satellites">
              <div className="flex flex-wrap gap-2">
                {INTEGRATION_OPTIONS.map((x) => (
                  <Chip key={x} on={formData.integrations.includes(x)} onClick={() => toggleArrayItem("integrations", x)}>
                    {x}
                  </Chip>
                ))}
              </div>
            </Section>
          </StorySection>

          {/* ── STEP 4 ── */}
          <StorySection n={4} title="Design & scope" text="Your first style colours the 3D build. More pages stack more layers behind it." next="Timeline & contact" onNext={() => scrollToStep(5)}>
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
          </StorySection>

          {/* ── STEP 5 ── */}
          <StorySection n={5} title="Timeline & contact" text="When do you need it, and how can we reach you?" next="Review & book" onNext={() => scrollToStep(6)}>
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
              <div className="grid sm:grid-cols-2 gap-x-4">
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
                right={<span className={`font-mono text-[11px] ${formData.description.trim().length >= 20 ? "text-emerald-400" : "text-white/40"}`}>{formData.description.trim().length}/20 min</span>}
              >
                <textarea id="pr-desc" rows={5} value={formData.description} onChange={(e) => set("description", e.target.value)} placeholder="What should it do? Who uses it? Any must-have features or references?" className={`${inputCls} resize-none leading-relaxed`} />
              </Field>
            </Section>
          </StorySection>

          {/* ── STEP 6 ── */}
          <StorySection n={6} title="Review & book" text="We compile your blueprint and calculate your booking deposit here — nowhere earlier.">
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
              <p className="mt-4 text-xs text-white/45">
                {blueprint.modules.length} modules: {blueprint.modules.map((m) => m.label).join(" · ")}
              </p>
            </Section>

            {missing.length > 0 && (
              <Section title="Almost there" icon={AlertCircle} hint={`${missing.length} item${missing.length > 1 ? "s" : ""} left`}>
                <ul className="space-y-2">
                  {missing.map((m) => (
                    <li key={m.label}>
                      <button type="button" onClick={() => scrollToStep(m.step)} className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-4 py-3 text-left text-sm text-white/80 hover:border-amber-400/50">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-300" /> {m.label}
                        </span>
                        <span className="text-xs text-amber-300">Fix in step {m.step} ↑</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <AnimatePresence mode="wait">
              {revealPhase !== "revealed" ? (
                <CompileSequence key="compile" active={revealPhase === "compiling"} modules={blueprint.modules.length} typeName={currentProjectTypeObj.name} />
              ) : (
                <motion.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                    disabled={!allTermsAccepted || isSubmitting || missing.length > 0}
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
                  <p className="text-center text-xs text-white/40">
                    {missing.length > 0 ? "Complete the items above to enable payment." : !allTermsAccepted ? "Tick all four boxes to enable payment." : "Secure checkout by Razorpay."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </StorySection>

          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/55">
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
        <div className="flex-1 min-w-0">
          {currentStep === 6 && revealPhase === "revealed" ? (
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
          <button type="button" onClick={() => scrollToStep(currentStep + 1)} className="px-5 py-3 rounded-xl bg-crimson text-white text-sm font-semibold">
            Next ↓
          </button>
        ) : (
          <button type="button" onClick={handleInitiatePayment} disabled={revealPhase !== "revealed" || !allTermsAccepted || isSubmitting || missing.length > 0} className="px-5 py-3 rounded-xl bg-gradient-to-r from-crimson to-bright-red text-white text-sm font-semibold disabled:opacity-40">
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

/** One chapter of the scroll story — big watermark number, reveal-on-scroll and a "next" cue. */
function StorySection({ n, title, text, next, onNext, children }: { n: number; title: string; text: string; next?: string; onNext?: () => void; children: React.ReactNode }) {
  return (
    <section id={`step-${n}`} data-step={n} className="relative scroll-mt-[140px] py-14 sm:py-20 border-b border-white/[0.05] last:border-b-0">
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1, ease: EASE }}
        className="pointer-events-none absolute -top-2 right-0 font-orbitron font-black text-[7rem] sm:text-[9rem] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.06)] select-none"
      >
        0{n}
      </motion.span>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={{ duration: 0.7, ease: EASE }} className="relative mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-bright-red">Step {n} of 6</div>
        <h2 className="mt-2 font-orbitron font-black text-2xl sm:text-4xl text-white tracking-tight">{title}</h2>
        <p className="mt-3 max-w-xl text-sm sm:text-base text-white/55">{text}</p>
      </motion.div>
      <div className="relative space-y-6">{children}</div>
      {next && onNext && (
        <motion.button
          type="button"
          onClick={onNext}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          whileHover={{ y: 2 }}
          className="group mt-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] pl-5 pr-2 py-2 text-sm text-white/70 hover:text-white hover:border-bright-red/60 transition-colors"
        >
          Next: <span className="font-semibold text-white">{next}</span>
          <span className="w-8 h-8 rounded-full bg-crimson flex items-center justify-center">
            <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <ArrowRight className="w-4 h-4 rotate-90" />
            </motion.span>
          </span>
        </motion.button>
      )}
    </section>
  );
}

/** Heads-up display layered over the 3D build (replaces the long module list). */
function BuildHud({
  typeName, category, typeIcon: TypeIcon, timeline, size, motionLevel, styles, moduleCount, progress, stepTitle, assembled,
}: {
  typeName: string;
  category: string;
  typeIcon: LucideIcon;
  timeline: string;
  size: string;
  motionLevel: string;
  styles: string[];
  moduleCount: number;
  progress: number;
  stepTitle: string;
  assembled: boolean;
}) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
      {/* top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 pl-2 pr-4 py-2">
          <span className="w-9 h-9 rounded-xl bg-crimson/20 border border-crimson/40 flex items-center justify-center shrink-0">
            <TypeIcon className="w-4 h-4 text-bright-red" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-bright-red animate-pulse" /> Live build · {stepTitle}
            </span>
            <AnimatePresence mode="wait">
              <motion.span key={typeName} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="block text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[260px]">
                {typeName}
              </motion.span>
            </AnimatePresence>
            <span className="hidden sm:block text-[11px] text-white/45 truncate">{category}</span>
          </span>
        </div>
        <div className="relative w-12 h-12 shrink-0 rounded-full bg-black/45 backdrop-blur-md border border-white/10" aria-label={`Builder ${progress}% complete`}>
          <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
            <motion.circle cx="24" cy="24" r={r} stroke={assembled ? "#34D399" : "#FF1E3C"} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c - (c * progress) / 100 }} transition={{ duration: 0.8, ease: EASE }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{progress}%</span>
        </div>
      </div>

      {/* bottom */}
      <div className="hidden sm:flex items-end justify-between gap-3">
        <div className="flex gap-2">
          {[
            { k: "Timeline", v: timeline },
            { k: "Size", v: size },
            { k: "Motion", v: motionLevel },
          ].map((d) => (
            <div key={d.k} className="rounded-xl bg-black/45 backdrop-blur-md border border-white/10 px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">{d.k}</div>
              <AnimatePresence mode="wait">
                <motion.div key={d.v} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-xs font-semibold text-white whitespace-nowrap">
                  {d.v}
                </motion.div>
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-black/45 backdrop-blur-md border border-white/10 px-3 py-2 text-right">
          <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">Modules</div>
          <div className="flex items-center gap-2 justify-end">
            <div className="flex -space-x-1.5">
              {styles.slice(0, 4).map((s) => (
                <span key={s} className="w-3.5 h-3.5 rounded-full border border-black" style={{ background: DESIGN_STYLES.find((d) => d.id === s)?.color }} />
              ))}
            </div>
            <motion.span key={moduleCount} initial={{ scale: 1.6, color: "#FF1E3C" }} animate={{ scale: 1, color: "#ffffff" }} className="text-sm font-bold tabular-nums">
              {moduleCount}
            </motion.span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {assembled && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-20 sm:top-24 inset-x-0 flex justify-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5" /> Blueprint assembled
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Short "compiling" sequence that plays before the deposit is revealed. */
function CompileSequence({ active, modules, typeName }: { active: boolean; modules: number; typeName: string }) {
  const lines = [`Architecture · ${typeName}`, `${modules} modules wired`, "Design system & motion", "Timeline & delivery plan", "Calculating booking deposit"];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (!active) return;
    setDone(0);
    const t = setInterval(() => setDone((d) => Math.min(lines.length, d + 1)), 400);
    return () => clearInterval(t);
  }, [active, lines.length]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }} transition={{ duration: 0.5, ease: EASE }} className="rounded-[28px] border border-white/[0.08] bg-[#0a0a0c]/85 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <Loader2 className={`w-5 h-5 text-bright-red ${active ? "animate-spin" : ""}`} />
        <p className="font-semibold text-white">{active ? "Compiling your blueprint…" : "Scroll here to compile your blueprint"}</p>
      </div>
      <ul className="mt-5 space-y-2 font-mono text-sm">
        {lines.map((l, i) => (
          <li key={l} className={`flex items-center gap-3 transition-colors ${i < done ? "text-white/80" : "text-white/25"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${i < done ? "bg-emerald-500 border-emerald-400" : "border-white/15"}`}>{i < done && <Check className="w-3 h-3 text-white" />}</span>
            {l}
          </li>
        ))}
      </ul>
      <div className="mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-crimson to-emerald-400" animate={{ width: `${(done / lines.length) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
    </motion.div>
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
