"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent, MotionValue } from "framer-motion";
import {
  Sparkles, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Shield, Lock, Layers, Cpu, Globe, Smartphone,
  LayoutDashboard, ShoppingCart, BookOpen, Calendar, Users, Database, Key, Palette, Clock, Loader2, Check, Zap,
  MessageSquare, Search, Mail, Upload, CreditCard, Repeat, FileText, Building2, Briefcase, PartyPopper, Bot,
  Wrench, User, Rocket, Eye, LucideIcon, Box,
} from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PROJECT_TYPES, calculateProjectAdvance } from "@/lib/project-calculator";
import { scrollToId } from "@/lib/scroll-store";
type ModuleItem = { id: string; label: string };

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

const FEATURE_OPTIONS: { id: string; name: string; desc: string; icon: LucideIcon; shape: string }[] = [
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

// three concrete deliverables shown on each build-type panel
const TYPE_DELIVERABLES: Record<string, string[]> = {
  "personal-portfolio": ["Interactive project showcase", "Resume & skills sections", "Contact & social links"],
  "landing-page": ["Conversion-focused layout", "Lead capture form", "Speed & SEO optimised"],
  "blog-content": ["Article & category system", "CMS editing", "Newsletter capture"],
  "business-website": ["Services & team pages", "Enquiry & lead forms", "Google-ready SEO setup"],
  "agency-website": ["Case study showcase", "Animated reels & motion", "Quote request flow"],
  "corporate-website": ["Multi-page structure", "Compliance & policy pages", "Secure, scalable hosting"],
  "event-website": ["Speakers & schedule", "Ticket / registration", "Countdown & updates"],
  "community-platform": ["Member profiles & feeds", "Discussions & messaging", "Moderation tools"],
  "booking-platform": ["Calendar slot booking", "Online payments", "Automated reminders"],
  "ecommerce-website": ["Product catalog & cart", "Razorpay checkout", "Orders & inventory"],
  "lms-edtech": ["Courses & video lessons", "Quizzes & certificates", "Student dashboards"],
  "admin-management": ["Charts & KPIs", "Role-based access", "Audit logs & workflows"],
  "saas-platform": ["Auth & multi-tenancy", "Subscription billing", "Admin & API"],
  "ai-platform": ["AI agents & chat", "RAG knowledge base", "Workflow automation"],
  "mobile-application": ["Android & iOS apps", "Push notifications", "Device features"],
  "custom-other": ["Discovery & architecture", "Bespoke engineering", "Built around your idea"],
};

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

  /* ───────────────────────── modules the client has picked (for the review summary) ───────────────────────── */

  const modules: ModuleItem[] = useMemo(() => {
    const mods: ModuleItem[] = [];
    const add = (id: string, label: string) => {
      if (!mods.some((m) => m.id === id)) mods.push({ id, label });
    };
    if (formData.authOption !== "No Login Required") add("auth", "Secure login");
    if (formData.authExtras.includes("Two-Factor Authentication") && formData.authOption !== "No Login Required") add("2fa", "2-step verification");
    if (formData.authExtras.includes("Role-Based Access") && formData.authOption !== "No Login Required") add("roles", "Role-based access");
    if (formData.databaseOption === "Yes") add("db", "Cloud database");
    if (formData.dashboardOption !== "No Dashboard") add("dash", formData.dashboardOption);
    FEATURE_OPTIONS.forEach((f) => formData.features.includes(f.id) && add(f.id, f.name));
    if (formData.purposes.includes("Provide AI Features")) add("ai_integration", "AI agents & LLMs");
    formData.integrations.forEach((i) => add(`int-${i}`, i));
    return mods;
  }, [formData]);

  // picking a type is the first decision — confirm it, then glide to the next chapter
  const handleTypeSelect = (id: string) => {
    set("projectType", id);
    setErrorMessage(null);
    setTimeout(() => {
      if (id === "custom-other") scrollToId("pr-custom-panel");
      else scrollToStep(2);
    }, 750);
  };

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
          Scroll through each chapter and tap what you need — one decision at a time. Your booking deposit is calculated and shown only at the final step.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
          {[
            { i: Box, t: "Choose", d: "Browse panels & pick your build" },
            { i: Eye, t: "Shape", d: "Features, stack & design" },
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

      {/* ── Scroll story: one chapter, one decision at a time ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 pb-10">
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
          <StorySection n={1} title="What do you want to build?" text="Scroll to browse every build type. Tap a panel to choose it — we'll take you straight to the next chapter." next="Goals & features" onNext={() => scrollToStep(2)}>
            <TypeReel value={formData.projectType} onSelect={handleTypeSelect} />
            <AnimatePresence>
              {formData.projectType === "custom-other" && (
                <motion.div id="pr-custom-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden scroll-mt-40">
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
          <StorySection n={2} title="Goals & features" text="One panel at a time — scroll and each decision slides in on top of the last." next="Tech stack" onNext={() => scrollToStep(3)}>
            <PanelStack labels={["Goals", "Features"]}>
              <Section flat title="What should it achieve?" icon={Rocket} hint="Select all that apply">
                <div className="flex flex-wrap gap-2.5">
                  {PURPOSE_OPTIONS.map((p) => (
                    <Chip key={p} on={formData.purposes.includes(p)} onClick={() => toggleArrayItem("purposes", p)}>
                      {p}
                    </Chip>
                  ))}
                </div>
              </Section>
              <Section flat title={`${currentProjectTypeObj.name} features`} icon={Zap} hint="Responsive design always included">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FEATURE_OPTIONS.map((f, i) => {
                    const on = formData.features.includes(f.id);
                    return (
                      <Tile key={f.id} i={i} on={on} onClick={() => toggleArrayItem("features", f.id)} compact>
                        <div className="flex items-center gap-3">
                          <motion.span animate={on ? { rotateY: [0, 180, 360] } : { rotateY: 0 }} transition={{ duration: 0.7 }} style={{ transformPerspective: 600 }}>
                            <IconBadge icon={f.icon} on={on} small />
                          </motion.span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-white">{f.name}</h4>
                            <p className="text-xs text-white/50">{f.desc}</p>
                          </div>
                          <CheckDot on={on} />
                        </div>
                      </Tile>
                    );
                  })}
                </div>
              </Section>
            </PanelStack>
          </StorySection>

          {/* ── STEP 3 ── */}
          <StorySection n={3} title="Tech stack" text="Accounts, data, dashboards and connected services — stacked one by one." next="Design & scope" onNext={() => scrollToStep(4)}>
            <PanelStack labels={["Login", "Dashboard", "Database", "Integrations"]}>
              <Section flat title="User accounts & login" icon={Key}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {["No Login Required", "Email + Password", "Google Login", "Phone OTP", "Email OTP", "Multiple Login Methods"].map((opt) => (
                    <Option key={opt} on={formData.authOption === opt} onClick={() => set("authOption", opt)}>
                      {opt}
                    </Option>
                  ))}
                </div>
                <AnimatePresence>
                  {formData.authOption !== "No Login Required" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <p className="mt-5 mb-2.5 text-xs font-semibold text-white/55">Security add-ons</p>
                      <div className="flex flex-wrap gap-2.5">
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
              <Section flat title="Dashboard & control center" icon={LayoutDashboard}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {["No Dashboard", "User Dashboard", "Admin Dashboard", "User + Admin Dashboard", "Multi-role Dashboard"].map((d) => (
                    <Option key={d} on={formData.dashboardOption === d} onClick={() => set("dashboardOption", d)}>
                      {d}
                    </Option>
                  ))}
                </div>
              </Section>
              <Section flat title="Database" icon={Database} hint="Supabase / PostgreSQL">
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { v: "No", d: "Static content only" },
                    { v: "Yes", d: "Accounts, orders & data" },
                    { v: "Not Sure", d: "We'll recommend" },
                  ].map((o) => (
                    <Option key={o.v} on={formData.databaseOption === o.v} onClick={() => set("databaseOption", o.v)}>
                      <span className="block font-semibold">{o.v}</span>
                      <span className="block text-[11px] opacity-60">{o.d}</span>
                    </Option>
                  ))}
                </div>
              </Section>
              <Section flat title="Integrations" icon={Globe} hint="Third-party services">
                <div className="flex flex-wrap gap-2.5">
                  {INTEGRATION_OPTIONS.map((x) => (
                    <Chip key={x} on={formData.integrations.includes(x)} onClick={() => toggleArrayItem("integrations", x)}>
                      {x}
                    </Chip>
                  ))}
                </div>
              </Section>
            </PanelStack>
          </StorySection>

          {/* ── STEP 4 ── */}
          <StorySection n={4} title="Design & scope" text="Pick the look and feel. Your first style becomes the primary one." next="Timeline & contact" onNext={() => scrollToStep(5)}>
            <PanelStack labels={["Style", "Motion", "Size", "Existing design"]}>
              <Section flat title="Visual style" icon={Palette} hint="Select one or more">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {DESIGN_STYLES.map((s, i) => {
                    const on = formData.designStyles.includes(s.id);
                    const primary = formData.designStyles[0] === s.id;
                    return (
                      <Tile key={s.id} i={i} on={on} onClick={() => toggleArrayItem("designStyles", s.id)} compact>
                        <div className="h-16 rounded-xl mb-3 border border-white/10 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.color}66, #0b0b0e 75%)` }}>
                          <span className="absolute top-2 left-2 right-2 h-1.5 rounded-full bg-white/15" />
                          <span className="absolute bottom-2 left-2 w-6 h-1.5 rounded-full" style={{ background: s.color }} />
                          <span className="absolute bottom-2 left-10 w-10 h-1.5 rounded-full bg-white/20" />
                          {primary && <span className="absolute top-5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white">Primary</span>}
                        </div>
                        <h4 className="text-sm font-semibold text-white truncate">{s.label}</h4>
                        <p className="text-[11px] text-white/45 line-clamp-1">{s.desc}</p>
                      </Tile>
                    );
                  })}
                </div>
              </Section>
              <Section flat title="Animation & motion" icon={Sparkles}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "Minimal", desc: "Subtle fades", bars: 1 },
                    { id: "Standard", desc: "Smooth cards & scroll", bars: 2 },
                    { id: "Advanced", desc: "Parallax & micro-FX", bars: 3 },
                    { id: "Cinematic", desc: "3D & WebGL scenes", bars: 4 },
                  ].map((a) => (
                    <Option key={a.id} on={formData.animationLevel === a.id} onClick={() => set("animationLevel", a.id)}>
                      <span className="flex gap-1 mb-3">
                        {[1, 2, 3, 4].map((b) => (
                          <span key={b} className={`h-6 w-1.5 rounded-full ${b <= a.bars ? "bg-bright-red" : "bg-white/10"}`} />
                        ))}
                      </span>
                      <span className="block font-semibold text-sm">{a.id}</span>
                      <span className="block text-[11px] opacity-60">{a.desc}</span>
                    </Option>
                  ))}
                </div>
              </Section>
              <Section flat title="Size of the project" icon={Layers}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["1 Page (Single Landing)", "2–5 Pages", "6–10 Pages", "11–20 Pages", "20+ Pages", "Dynamic Web Application"].map((p, i) => (
                    <Option key={p} on={formData.pageRange === p} onClick={() => set("pageRange", p)}>
                      <span className="flex -space-x-3 mb-3">
                        {Array.from({ length: Math.min(i + 1, 5) }).map((_, k) => (
                          <span key={k} className="w-6 h-8 rounded-md border border-white/20 bg-white/[0.06]" style={{ transform: `translateY(${-k * 2}px)` }} />
                        ))}
                      </span>
                      <span className="block font-semibold text-sm">{p}</span>
                    </Option>
                  ))}
                </div>
              </Section>
              <Section flat title="Existing design" icon={Eye}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["No — CodeXa should design everything", "Yes — Figma Link Available", "Yes — Reference Websites", "Yes — Screenshot / Wireframes"].map((d) => (
                    <Option key={d} on={formData.hasExistingDesign === d} onClick={() => set("hasExistingDesign", d)}>
                      {d}
                    </Option>
                  ))}
                </div>
                <AnimatePresence>
                  {formData.hasExistingDesign !== "No — CodeXa should design everything" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <input type="url" value={formData.designLinks} onChange={(e) => set("designLinks", e.target.value)} placeholder="Paste Figma / reference URLs" className={`${inputCls} mt-4`} aria-label="Design links" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Section>
            </PanelStack>
          </StorySection>

          {/* ── STEP 5 ── */}
          <StorySection n={5} title="Timeline & contact" text="When do you need it, and how can we reach you?" next="Review & book" onNext={() => scrollToStep(6)}>
            <PanelStack labels={["Timeline", "Budget"]}>
              <Section flat title="Target delivery" icon={Clock}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { v: "Urgent (< 1 Week)", d: "Priority sprint" },
                    { v: "1–2 Weeks", d: "Fast track" },
                    { v: "2–4 Weeks", d: "Standard" },
                    { v: "1–2 Months", d: "Large scope" },
                    { v: "Flexible Timeline", d: "Quality first" },
                  ].map((t) => (
                    <Option key={t.v} on={formData.timeline === t.v} onClick={() => set("timeline", t.v)}>
                      <Clock className="w-5 h-5 mb-3 text-bright-red" />
                      <span className="block font-semibold text-sm">{t.v}</span>
                      <span className="block text-[11px] opacity-60">{t.d}</span>
                    </Option>
                  ))}
                </div>
              </Section>
              <Section flat title="Your overall budget" icon={Briefcase} hint="Helps us propose the right scope">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Below ₹10,000", "₹10,000–₹20,000", "₹20,000–₹40,000", "₹40,000–₹75,000", "₹75,000+", "Need CodeXa Recommendation"].map((b) => (
                    <Option key={b} on={formData.budgetRange === b} onClick={() => set("budgetRange", b)}>
                      <span className="block font-semibold text-sm py-2">{b}</span>
                    </Option>
                  ))}
                </div>
              </Section>
            </PanelStack>

            <Section title="Contact details" icon={User} hint="We'll reach you here">
              <div className="grid sm:grid-cols-2 gap-x-5">
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
          <StorySection n={6} title="Review & book" text="Check your blueprint, then reserve your build slot. Your booking deposit is calculated here — nowhere earlier.">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
              {/* receipt */}
              <BlueprintReceipt
                typeName={formData.projectType === "custom-other" && formData.customProjectType ? formData.customProjectType : currentProjectTypeObj.name}
                category={currentProjectTypeObj.category}
                typeIcon={TYPE_ICONS[formData.projectType] || Box}
                onEdit={scrollToStep}
                groups={[
                  { step: 2, title: "Goals", items: formData.purposes },
                  { step: 2, title: "Features", items: FEATURE_OPTIONS.filter((f) => formData.features.includes(f.id)).map((f) => f.name) },
                  {
                    step: 3,
                    title: "Tech stack",
                    items: [
                      formData.authOption,
                      ...(formData.authOption !== "No Login Required" ? formData.authExtras : []),
                      formData.dashboardOption,
                      `Database: ${formData.databaseOption}`,
                      ...formData.integrations,
                    ],
                  },
                  { step: 4, title: "Design", items: [...formData.designStyles, `${formData.animationLevel} motion`, formData.pageRange, formData.hasExistingDesign] },
                  { step: 5, title: "Timeline & budget", items: [formData.timeline, formData.budgetRange] },
                  { step: 5, title: "Contact", items: [formData.fullName, formData.email, formData.phone, formData.company, formData.city].filter(Boolean) as string[] },
                ]}
              />

              {/* booking card */}
              <div className="space-y-5">
                {missing.length > 0 && (
                  <div className="rounded-[24px] border border-amber-400/30 bg-amber-500/[0.06] p-5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                      <AlertCircle className="w-4 h-4" /> {missing.length} item{missing.length > 1 ? "s" : ""} needed before booking
                    </p>
                    <ul className="mt-3 space-y-2">
                      {missing.map((m) => (
                        <li key={m.label}>
                          <button type="button" onClick={() => scrollToStep(m.step)} className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-black/20 px-3.5 py-2.5 text-left text-sm text-white/80 hover:border-amber-400/50">
                            {m.label}
                            <span className="text-xs text-amber-300 shrink-0">Chapter {m.step} ↑</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {revealPhase !== "revealed" ? (
                    <CompileSequence key="compile" active={revealPhase === "compiling"} modules={modules.length} typeName={currentProjectTypeObj.name} />
                  ) : (
                    <motion.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                      <DepositReveal result={advanceResult} />

                      <div className="rounded-[24px] border border-white/[0.08] bg-[#0a0a0c]/85 p-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">What happens next</p>
                        <ol className="relative space-y-4 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                          {["Pay the booking deposit", "Requirement review with our team", "Final quote & delivery milestones", "Your build begins"].map((s, i) => (
                            <motion.li key={s} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="relative flex items-center gap-3 text-sm text-white/75">
                              <span className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-crimson text-white" : "bg-white/[0.06] text-white/60"}`}>{i + 1}</span>
                              {s}
                            </motion.li>
                          ))}
                        </ol>
                      </div>

                      <div className="space-y-2.5">
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

                      <motion.button
                        type="button"
                        onClick={handleInitiatePayment}
                        disabled={!allTermsAccepted || isSubmitting || missing.length > 0}
                        whileHover={allTermsAccepted && !isSubmitting && missing.length === 0 ? { y: -2 } : undefined}
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
                      <p className="flex items-center justify-center gap-2 text-center text-xs text-white/40">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        {missing.length > 0 ? "Complete the items above to enable payment." : !allTermsAccepted ? "Tick all four boxes to enable payment." : "Secure checkout by Razorpay."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
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

/** A large panel that rises out of depth as it scrolls into view (scroll-scrubbed, not one-shot). */
function Section({ title, icon: Icon, hint, children, flat }: { title: string; icon: LucideIcon; hint?: string; children: React.ReactNode; flat?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.6"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [110, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [0.15, 1]);
  // resolves to no transform once settled so inner fixed elements behave
  const transformPerspective = useTransform(scrollYProgress, (v) => (v >= 0.999 ? 0 : 1300));
  return (
    <motion.section
      ref={ref}
      // inside a PanelStack the stack drives the motion, so the panel itself stays flat
      style={flat ? undefined : { rotateX, y, scale, opacity, transformPerspective, transformOrigin: "50% 0%" }}
      className={`relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-[#0b0b0d]/95 to-[#08080a] backdrop-blur-md p-6 sm:p-9 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.9)] ${flat ? "shadow-[0_-30px_80px_-30px_rgba(0,0,0,0.95)]" : ""}`}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-crimson/10 blur-[90px]" />
      <div className="relative flex items-center justify-between gap-3 mb-6">
        <h3 className="flex items-center gap-3 font-orbitron font-bold text-lg sm:text-xl text-white">
          <span className="w-11 h-11 rounded-2xl bg-crimson/15 border border-crimson/40 flex items-center justify-center shadow-[0_0_25px_rgba(217,4,41,0.25)]">
            <Icon className="w-5 h-5 text-bright-red" />
          </span>
          {title}
        </h3>
        {hint && <span className="text-xs text-white/40 text-right">{hint}</span>}
      </div>
      <div className="relative">{children}</div>
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
      className={`relative w-full text-left rounded-2xl border px-4 py-3.5 text-sm transition ${on ? "bg-crimson/15 border-bright-red/70 text-white shadow-[0_0_24px_-8px_rgba(217,4,41,0.8)]" : "border-white/10 bg-white/[0.02] text-white/65 hover:text-white hover:border-white/25 hover:bg-white/[0.04]"}`}
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
    <section id={`step-${n}`} data-step={n} className="relative scroll-mt-[130px] py-20 sm:py-28 border-b border-white/[0.05] last:border-b-0">
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0, x: -40, rotateY: -30 }}
        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1.1, ease: EASE }}
        style={{ transformPerspective: 900 }}
        className="pointer-events-none absolute top-6 right-0 font-orbitron font-black text-[8rem] sm:text-[13rem] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.07)] select-none"
      >
        0{n}
      </motion.span>
      <div className="relative mb-12 max-w-3xl" style={{ perspective: 900 }}>
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} className="flex items-center gap-3">
          <span className="h-px w-10 bg-bright-red" />
          <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">Chapter {n} of 6</span>
        </motion.div>
        {/* the h2 itself is observed — the words start clipped, so they can't trigger their own reveal */}
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          className="mt-4 font-orbitron font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.02]"
        >
          {title.split(" ").map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.22em] pb-1">
              <motion.span
                className="inline-block"
                variants={{
                  hidden: { y: "110%", rotateX: -80, opacity: 0 },
                  show: { y: "0%", rotateX: 0, opacity: 1, transition: { duration: 0.9, delay: i * 0.06, ease: EASE } },
                }}
                style={{ transformOrigin: "50% 100%" }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2, ease: EASE }} className="mt-5 text-base sm:text-lg text-white/55 leading-relaxed">
          {text}
        </motion.p>
      </div>
      <div className="relative space-y-8">{children}</div>
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

/**
 * Step 1 — a pinned, scroll-driven reel of large 3D panels (one build type per panel).
 * Desktop: vertical scroll moves the reel sideways; the centred panel is in focus.
 * Mobile: a native swipe carousel with snap points.
 */
function TypeReel({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = PROJECT_TYPES.length;

  useEffect(() => {
    const measure = () => {
      if (track.current) setDist(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const x = useTransform(scrollYProgress, [0.03, 0.97], [0, -dist]);
  const p = useTransform(scrollYProgress, [0.03, 0.97], [0, 1]);
  const selectedIdx = PROJECT_TYPES.findIndex((t) => t.id === value);

  return (
    <div className="ml-[calc(50%-50vw)] w-screen">
      {/* desktop: pinned horizontal reel */}
      <div ref={ref} className="hidden md:block relative" style={{ height: `${n * 22 + 60}vh` }}>
        <div className="sticky top-[118px] h-[calc(100vh-118px)] overflow-hidden flex flex-col justify-center">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(45%_55%_at_50%_50%,rgba(217,4,41,0.16),transparent_70%)]" />
          <div style={{ perspective: 1800 }}>
            <motion.div ref={track} style={{ x, transformStyle: "preserve-3d" }} className="flex items-center gap-7 w-max px-[calc(50vw-200px)]">
              {PROJECT_TYPES.map((pt, i) => (
                <ReelPanel key={pt.id} i={i} n={n} p={p} pt={pt} selected={value === pt.id} onSelect={onSelect} />
              ))}
            </motion.div>
          </div>

          {/* rail + hint */}
          <div className="relative mt-10 flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {PROJECT_TYPES.map((pt, i) => (
                <ReelTick key={pt.id} i={i} n={n} p={p} selected={i === selectedIdx} />
              ))}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">Scroll to browse · tap a panel to choose</p>
          </div>
        </div>
      </div>

      {/* mobile: swipe carousel */}
      <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory px-[10vw] pb-6 [scrollbar-width:none]" style={{ perspective: 1000 }}>
        {PROJECT_TYPES.map((pt, i) => (
          <motion.div
            key={pt.id}
            className="snap-center shrink-0 w-[80vw]"
            initial={{ opacity: 0, rotateY: -25, x: 40 }}
            whileInView={{ opacity: 1, rotateY: 0, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <PanelFace pt={pt} i={i} n={n} selected={value === pt.id} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReelPanel({ pt, i, n, p, selected, onSelect }: { pt: (typeof PROJECT_TYPES)[number]; i: number; n: number; p: MotionValue<number>; selected: boolean; onSelect: (id: string) => void }) {
  const c = i / (n - 1);
  const w = 0.22;
  const rotateY = useTransform(p, [c - w, c, c + w], [38, 0, -38]);
  const scale = useTransform(p, [c - w, c, c + w], [0.8, 1, 0.8]);
  const z = useTransform(p, [c - w, c, c + w], [-280, 0, -280]);
  const opacity = useTransform(p, [c - w * 1.4, c, c + w * 1.4], [0.25, 1, 0.25]);
  const glowO = useTransform(p, [c - w * 0.4, c, c + w * 0.4], [0, 1, 0]);
  return (
    <motion.div style={{ rotateY, scale, z, opacity, transformStyle: "preserve-3d" }} className="relative shrink-0 w-[400px]">
      <motion.div style={{ opacity: glowO }} className="absolute -inset-6 rounded-[40px] bg-crimson/20 blur-3xl pointer-events-none" />
      <PanelFace pt={pt} i={i} n={n} selected={selected} onSelect={onSelect} tall />
    </motion.div>
  );
}

/** The visual card used by both the desktop reel and the mobile carousel. */
function PanelFace({ pt, i, n, selected, onSelect, tall }: { pt: (typeof PROJECT_TYPES)[number]; i: number; n: number; selected: boolean; onSelect: (id: string) => void; tall?: boolean }) {
  const Icon = TYPE_ICONS[pt.id] || Box;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(pt.id)}
      aria-pressed={selected}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative w-full overflow-hidden rounded-[32px] border text-left ${tall ? "h-[min(560px,68vh)]" : "h-[480px]"} p-7 flex flex-col transition-colors ${
        selected ? "border-bright-red bg-gradient-to-br from-crimson/30 via-[#120709] to-[#08080a] shadow-[0_30px_90px_-25px_rgba(217,4,41,0.85)]" : "border-white/[0.09] bg-gradient-to-br from-white/[0.06] via-[#0b0b0d] to-[#08080a] hover:border-white/25"
      }`}
    >
      {/* decorative grid + giant ghost icon */}
      <div className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
      <Icon className="absolute -right-8 -bottom-8 w-56 h-56 text-white/[0.035] group-hover:text-white/[0.06] transition-colors" strokeWidth={1} />

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.25em] text-white/40">
          {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
        {pt.badge && <span className="px-2.5 py-1 rounded-full bg-crimson text-[10px] font-semibold uppercase tracking-wider text-white">{pt.badge}</span>}
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: (i % 4) * 0.3 }}
        className={`relative mt-6 w-20 h-20 rounded-3xl flex items-center justify-center border ${
          selected ? "bg-crimson border-bright-red shadow-[0_0_50px_rgba(255,30,60,0.7)]" : "bg-white/[0.05] border-white/10 group-hover:border-bright-red/50"
        } transition-colors`}
      >
        <Icon className={`w-9 h-9 ${selected ? "text-white" : "text-bright-red"}`} />
        {/* spark burst on selection */}
        <AnimatePresence>
          {selected &&
            Array.from({ length: 12 }).map((_, k) => {
              const a = (k / 12) * Math.PI * 2;
              return (
                <motion.span
                  key={k}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 90, y: Math.sin(a) * 90, opacity: 0, scale: 0.3 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="pointer-events-none absolute w-1.5 h-1.5 rounded-full bg-bright-red shadow-[0_0_8px_#FF1E3C]"
                />
              );
            })}
        </AnimatePresence>
      </motion.div>

      <div className="relative mt-auto">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bright-red">{pt.category}</p>
        <h3 className="mt-2 font-orbitron font-black text-2xl text-white leading-tight">{pt.name}</h3>
        <p className="mt-2.5 text-sm text-white/55 leading-relaxed line-clamp-2">{pt.description}</p>
        <ul className="mt-4 space-y-1.5">
          {(TYPE_DELIVERABLES[pt.id] || []).map((d) => (
            <li key={d} className="flex items-center gap-2 text-xs text-white/75">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${selected ? "bg-bright-red" : "bg-white/[0.08]"}`}>
                <Check className="w-2.5 h-2.5 text-white" />
              </span>
              {d}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-black/30 text-xs text-white/70">
            <Clock className="w-3.5 h-3.5 text-bright-red" /> {pt.recommendedTimeline}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${selected ? "bg-white text-black" : "bg-crimson/90 text-white group-hover:bg-bright-red"}`}>
            {selected ? (
              <>
                <Check className="w-3.5 h-3.5" /> Selected
              </>
            ) : (
              <>
                Choose <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 16 }}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-bright-red flex items-center justify-center shadow-[0_0_25px_rgba(255,30,60,0.9)]"
          >
            <Check className="w-5 h-5 text-white" />
          </motion.span>
        )}
      </AnimatePresence>
      {selected && (
        <motion.span initial={{ opacity: 0.8, scale: 0.6 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: 0.9 }} className="pointer-events-none absolute inset-0 rounded-[32px] border-2 border-bright-red" />
      )}
    </motion.button>
  );
}

function ReelTick({ i, n, p, selected }: { i: number; n: number; p: MotionValue<number>; selected: boolean }) {
  const c = i / (n - 1);
  const width = useTransform(p, [c - 0.06, c, c + 0.06], [8, 28, 8]);
  return <motion.span style={{ width }} className={`h-1 rounded-full block ${selected ? "bg-emerald-400" : "bg-white/25"}`} />;
}

/**
 * "One decision at a time" stack.
 * Desktop: the chapter pins while you scroll; scroll position picks the active panel and
 * each change plays a short spring transition (no half-overlapped, scrubbed states).
 * Smaller screens: panels simply flow one after another.
 */
function PanelStack({ children, labels }: { children: React.ReactNode; labels: string[] }) {
  const items = React.Children.toArray(children);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (min-height: 700px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  if (!desktop) return <div className="space-y-8">{items}</div>;
  // mounted separately so its scroll target ref exists on first render
  return <PinnedStack items={items} labels={labels} />;
}

const STICKY_TOP = 130;

function PinnedStack({ items, labels }: { items: React.ReactNode[]; labels: string[] }) {
  const n = items.length;
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: [`start ${STICKY_TOP}px`, "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(n - 1, Math.max(0, Math.floor(v * n * 0.999)));
    setActive((cur) => (cur === idx ? cur : idx));
  });

  // jump to a panel by scrolling to the middle of its slice of the pinned range
  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - STICKY_TOP;
    const range = el.offsetHeight - (window.innerHeight - STICKY_TOP);
    const y = top + ((i + 0.5) / n) * range;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 0.9 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div ref={ref} className="relative" style={{ height: `${n * 70 + 30}vh` }}>
      <div className="sticky flex flex-col" style={{ top: STICKY_TOP, height: `calc(100vh - ${STICKY_TOP + 20}px)` }}>
        {/* all layers share one grid cell, so every panel takes the tallest panel's height
            and a taller panel behind never peeks out under a shorter one */}
        <div className="relative flex-1 min-h-0 pt-6 grid content-start" style={{ perspective: 1600 }}>
          {items.map((child, i) => {
            const d = i - active;
            const target =
              d < 0
                ? { y: Math.max(d, -3) * 22, scale: 1 + Math.max(d, -3) * 0.045, rotateX: 4, opacity: d < -3 ? 0 : 1 }
                : d === 0
                ? { y: 0, scale: 1, rotateX: 0, opacity: 1 }
                : { y: 160, scale: 0.95, rotateX: -22, opacity: 0 };
            return (
              <motion.div
                key={i}
                initial={false}
                animate={target}
                transition={{ type: "spring", stiffness: 160, damping: 22, mass: 0.9, opacity: { duration: 0.22, ease: "easeOut" } }}
                style={{ gridArea: "1 / 1", zIndex: i, transformOrigin: "50% 0%", pointerEvents: d === 0 ? "auto" : "none" }}
                className="relative"
                aria-hidden={d !== 0}
              >
                <div className="relative h-full flex flex-col [&>*]:flex-1">
                  {child}
                  <motion.div
                    initial={false}
                    animate={{ opacity: d < 0 ? 0.55 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="pointer-events-none absolute inset-0 rounded-[30px] bg-black"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* footer: progress + next cue */}
        <div className="relative z-50 flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            {labels.map((l, i) => (
              <button
                key={l}
                type="button"
                onClick={() => goTo(i)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
                  i === active ? "bg-crimson text-white shadow-[0_0_18px_rgba(217,4,41,0.5)]" : i < active ? "text-emerald-300 hover:bg-white/[0.05]" : "text-white/40 hover:text-white/70"
                }`}
              >
                {i < active ? <Check className="w-3.5 h-3.5" /> : <span className="font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>}
                {l}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
            {active < n - 1 ? (
              <>
                Scroll for {labels[active + 1]}
                <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.3, repeat: Infinity }}>
                  ↓
                </motion.span>
              </>
            ) : (
              "Last panel in this chapter"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Receipt-style summary of everything the client picked, with jump-back edit links. */
function BlueprintReceipt({
  typeName, category, typeIcon: TypeIcon, groups, onEdit,
}: {
  typeName: string;
  category: string;
  typeIcon: LucideIcon;
  groups: { step: number; title: string; items: string[] }[];
  onEdit: (step: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.9, ease: EASE }}
      style={{ transformPerspective: 1200 }}
      className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-[#08080a]/95"
    >
      <div className="p-6 sm:p-8 border-b border-dashed border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="w-14 h-14 rounded-2xl bg-crimson flex items-center justify-center shadow-[0_0_35px_rgba(255,30,60,0.55)] shrink-0">
              <TypeIcon className="w-7 h-7 text-white" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Your blueprint</p>
              <h3 className="font-orbitron font-black text-xl sm:text-2xl text-white truncate">{typeName}</h3>
              <p className="text-xs text-white/45">{category}</p>
            </div>
          </div>
          <button type="button" onClick={() => onEdit(1)} className="shrink-0 text-xs text-bright-red hover:text-white">
            Change
          </button>
        </div>
      </div>
      <div className="divide-y divide-dashed divide-white/10">
        {groups.map((g, gi) => (
          <motion.div key={g.title} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: gi * 0.07 }} className="px-6 sm:px-8 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">{g.title}</p>
              <button type="button" onClick={() => onEdit(g.step)} className="text-xs text-white/40 hover:text-bright-red">
                Edit
              </button>
            </div>
            {g.items.length ? (
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((it) => (
                  <span key={it} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/80">
                    <Check className="w-3 h-3 text-emerald-400" /> {it}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/35">Nothing selected</p>
            )}
          </motion.div>
        ))}
      </div>
      {/* perforated edge */}
      <div className="flex justify-between px-3 -mb-2.5" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="w-4 h-4 rounded-full bg-[#050505]" />
        ))}
      </div>
    </motion.div>
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
