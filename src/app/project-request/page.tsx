"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Lock,
  Layers,
  Cpu,
  Globe,
  Smartphone,
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Calendar,
  Users,
  Database,
  Key,
  Flame,
  Palette,
  Clock,
  IndianRupee,
  ChevronRight,
  HelpCircle,
  ExternalLink,
  Loader2,
  Check,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { NeonButton } from "@/components/ui/NeonButton";
import {
  PROJECT_TYPES,
  FEATURE_ADDONS,
  calculateProjectAdvance,
  ProjectTypeDefinition,
} from "@/lib/project-calculator";

declare global {
  interface Window {
    Razorpay: any;
  }
}

// 6 Structured Steps
const STEPS = [
  { id: 1, title: "Project Type", label: "Select Architecture" },
  { id: 2, title: "Purpose & Features", label: "Capabilities" },
  { id: 3, title: "Technical Stack", label: "Auth, DB & Dashboards" },
  { id: 4, title: "Design & Scope", label: "Visual Style & Pages" },
  { id: 5, title: "Timeline & Contact", label: "Specifications" },
  { id: 6, title: "Review & Advance", label: "Secure Booking" },
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
  { id: "Dark", label: "Dark Mode", desc: "CodeXa Signature Cyber Theme" },
  { id: "Futuristic", label: "Futuristic", desc: "Neon & Sci-Fi Aesthetics" },
  { id: "Premium", label: "Premium Luxury", desc: "Sleek, High-Contrast & Elegant" },
  { id: "Minimal", label: "Minimal Modern", desc: "Clean Typography & Spacing" },
  { id: "Glassmorphism", label: "Glassmorphism", desc: "Translucent Frosted Layers" },
  { id: "Corporate", label: "Corporate", desc: "Formal & Trust-Focused" },
  { id: "Cyber", label: "Cyberpunk", desc: "High Energy & Vibrant Accents" },
  { id: "Developer Style", label: "Developer / Terminal", desc: "Monospace & Code-First" },
  { id: "Colorful", label: "Vibrant Gradient", desc: "Rich Chromatic Palettes" },
  { id: "Custom", label: "Custom Bespoke", desc: "Tailored to Brand Identity" },
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

export default function ProjectRequestPage() {
  const router = useRouter();

  // Current wizard step
  const [currentStep, setCurrentStep] = useState(1);

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
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Real-time advance calculation
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
        ecommerce:
          formData.projectType === "ecommerce-website" ||
          formData.purposes.includes("Sell Products"),
        subscription:
          formData.projectType === "saas-platform" ||
          formData.purposes.includes("Build a Subscription Platform"),
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
      const updated = current.includes(item)
        ? current.filter((x) => x !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

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

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Check if all 4 terms are checked
  const allTermsAccepted =
    formData.termsInfoCorrect &&
    formData.termsAdvanceUnderstood &&
    formData.termsReviewUnderstood &&
    formData.termsPolicyAccepted;

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
        // Simulate immediate successful payment verification in development
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
              setErrorMessage(
                verifyData.error || "Payment verification failed. Please contact support."
              );
            }
          } catch (err: any) {
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
        setErrorMessage(
          `Payment failed: ${response.error?.description || "Transaction declined"}. Requirements saved.`
        );
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Order error:", err);
      setErrorMessage(err?.message || "Failed to process application. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-crimson selection:text-white relative overflow-x-hidden">
      {/* Razorpay Checkout SDK Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <Navbar />

      {/* Cyber Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-crimson/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-deep-red/10 rounded-full blur-[120px]" />
      </div>

      <main className="flex-grow pt-28 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Main Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-deep-red/20 border border-crimson/30 text-bright-red text-[11px] font-orbitron font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Interactive Requirement Builder & Deposit
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-orbitron font-black uppercase tracking-wider text-white">
            Start Your Project With <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson to-bright-red">CodeXa</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#888888] mt-3 leading-relaxed">
            Configure your technical specifications, view your live calculated booking advance deposit, and submit directly into our priority engineering queue.
          </p>
        </div>

        {/* Progress Bar & Step Tabs */}
        <div className="mb-10 max-w-4xl mx-auto">
          <div className="grid grid-cols-6 gap-2">
            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (step.id < currentStep || validateStep(currentStep)) {
                      setCurrentStep(step.id);
                      setErrorMessage(null);
                    }
                  }}
                  className={`flex flex-col items-center text-center p-2 rounded-lg transition-all border ${
                    isCurrent
                      ? "bg-card/80 border-bright-red shadow-neon"
                      : isCompleted
                      ? "bg-card/30 border-emerald-500/40 text-emerald-400"
                      : "bg-[#090909] border-white/5 opacity-50"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-orbitron font-black mb-1 ${
                      isCurrent
                        ? "bg-bright-red text-white"
                        : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-[#181818] text-[#777]"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <span className="hidden sm:block text-[10px] font-orbitron font-bold uppercase tracking-wider text-white truncate w-full">
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Connected Glow Line */}
          <div className="w-full bg-[#151515] h-1 rounded-full mt-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-crimson via-bright-red to-emerald-400 h-full"
              initial={{ width: "16%" }}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Validation / Error Banner */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto p-4 rounded-xl border border-bright-red/80 bg-deep-red/30 flex items-center gap-3 text-xs text-white mb-6 shadow-neon"
          >
            <AlertCircle className="w-5 h-5 text-bright-red shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[#aaa] hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Form Steps (8 Cols) */}
          <div className="lg:col-span-8 bg-[#0D0D0D]/90 border border-crimson/20 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
            
            {/* Corner Cyber Accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson" />

            <AnimatePresence mode="wait">
              
              {/* ─────────────────────────────────────────────────────────────
                  STEP 1: PROJECT TYPE SELECTION
              ────────────────────────────────────────────────────────────── */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="border-b border-crimson/15 pb-4">
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-crimson">
                      STEP 1 OF 6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-orbitron font-black uppercase text-white mt-1">
                      What Do You Want To Build?
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      Select your core project category. Base advance deposits range from ₹2,000 to ₹7,000.
                    </p>
                  </div>

                  {/* Project Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {PROJECT_TYPES.map((pt) => {
                      const isSelected = formData.projectType === pt.id;
                      return (
                        <div
                          key={pt.id}
                          onClick={() => setFormData((prev) => ({ ...prev, projectType: pt.id }))}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-deep-red/20 border-bright-red shadow-neon ring-1 ring-bright-red/50 scale-[1.01]"
                              : "bg-[#080808] border-white/5 hover:border-crimson/40 hover:bg-[#111]"
                          }`}
                        >
                          {pt.badge && (
                            <span className="absolute top-3 right-3 text-[9px] font-orbitron font-bold px-2 py-0.5 rounded bg-crimson text-white uppercase tracking-wider">
                              {pt.badge}
                            </span>
                          )}

                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-bright-red bg-bright-red text-white"
                                    : "border-[#444]"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <h3 className="font-orbitron font-bold text-sm text-white">
                                {pt.name}
                              </h3>
                            </div>
                            <p className="text-[11px] text-[#888888] line-clamp-2 leading-relaxed">
                              {pt.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                            <span className="text-[10px] font-orbitron text-[#777] uppercase">
                              Est. {pt.recommendedTimeline}
                            </span>
                            <span className="font-mono font-bold text-bright-red">
                              Base: ₹{pt.baseAdvance.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom / Other extra inputs */}
                  {formData.projectType === "custom-other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-5 rounded-xl bg-[#090909] border border-crimson/30 space-y-4 mt-4"
                    >
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-1.5">
                          Describe Your Custom Architecture Idea *
                        </label>
                        <input
                          type="text"
                          value={formData.customProjectType}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, customProjectType: e.target.value }))
                          }
                          placeholder="e.g. AI-driven financial sentiment analyzer with Discord alert bot..."
                          className="w-full bg-[#050505] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-2">
                          Closest System Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Website",
                            "Web Application",
                            "Mobile Application",
                            "Desktop Application",
                            "AI System",
                            "Automation",
                            "SaaS",
                            "Developer Tool",
                            "Internal Business Tool",
                            "Other",
                          ].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, closestCategory: cat }))
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-orbitron font-medium border transition-all ${
                                formData.closestCategory === cat
                                  ? "bg-crimson border-bright-red text-white"
                                  : "bg-[#111] border-white/5 text-[#888] hover:text-white"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 2: PROJECT PURPOSE & SPECIFIC FEATURES
              ────────────────────────────────────────────────────────────── */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="border-b border-crimson/15 pb-4">
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-crimson">
                      STEP 2 OF 6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-orbitron font-black uppercase text-white mt-1">
                      Project Purpose & Core Capabilities
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      What should this project primarily achieve? Select all that apply.
                    </p>
                  </div>

                  {/* Primary Purposes Multi-Select */}
                  <div>
                    <label className="text-[11px] font-orbitron font-bold uppercase tracking-wider text-white block mb-3">
                      Primary Objectives
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PURPOSE_OPTIONS.map((purpose) => {
                        const isSelected = formData.purposes.includes(purpose);
                        return (
                          <div
                            key={purpose}
                            onClick={() => toggleArrayItem("purposes", purpose)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                              isSelected
                                ? "bg-deep-red/20 border-bright-red text-white shadow-neon"
                                : "bg-[#080808] border-white/5 text-[#888] hover:text-white hover:bg-[#111]"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${
                                isSelected
                                  ? "bg-bright-red border-bright-red text-white"
                                  : "border-[#444]"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-medium">{purpose}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contextual Specific Features based on Project Type */}
                  <div className="pt-4 border-t border-crimson/15">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[11px] font-orbitron font-bold uppercase tracking-wider text-white">
                        {currentProjectTypeObj.name} Feature Checklist
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Responsive Design Included (Free)
                      </span>
                    </div>

                    {/* Feature Add-on Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: "payment_integration", name: "Payment Gateway Integration", addon: 500, desc: "Razorpay / UPI integration" },
                        { id: "ecommerce_system", name: "E-Commerce Shopping Cart & Catalog", addon: 700, desc: "Product variants, cart & checkout" },
                        { id: "subscription_system", name: "SaaS Subscription & Billing", addon: 700, desc: "Tiered billing & recurring plans" },
                        { id: "booking_system", name: "Interactive Booking & Slot System", addon: 500, desc: "Calendar scheduling & reservations" },
                        { id: "realtime_chat", name: "Real-Time Chat & Direct Messaging", addon: 700, desc: "Live conversations & channels" },
                        { id: "ai_integration", name: "AI Agent & LLM Integration", addon: 800, desc: "Chat assistants, RAG, automated workflows" },
                        { id: "cms", name: "Content Management CMS", addon: 300, desc: "Dynamic post & article editor" },
                        { id: "file_upload", name: "Cloud File & Image Uploads", addon: 300, desc: "Supabase / S3 media pipeline" },
                        { id: "email_notifications", name: "Automated Email Alerts (Resend)", addon: 250, desc: "Transactional trigger emails" },
                        { id: "advanced_search", name: "Advanced Search & Multi-Filters", addon: 250, desc: "Faceted query filtering" },
                      ].map((feat) => {
                        const isSelected = formData.features.includes(feat.id);
                        return (
                          <div
                            key={feat.id}
                            onClick={() => toggleArrayItem("features", feat.id)}
                            className={`p-3 rounded-xl border cursor-pointer flex items-start justify-between gap-3 transition-all ${
                              isSelected
                                ? "bg-deep-red/25 border-bright-red shadow-neon"
                                : "bg-[#080808] border-white/5 hover:border-crimson/30 hover:bg-[#111]"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-[10px] border ${
                                  isSelected
                                    ? "bg-bright-red border-bright-red text-white"
                                    : "border-[#444]"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-orbitron font-bold text-white leading-tight">
                                  {feat.name}
                                </h4>
                                <p className="text-[10px] text-[#777] mt-0.5">{feat.desc}</p>
                              </div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-bright-red shrink-0">
                              +₹{feat.addon}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 3: TECHNICAL ARCHITECTURE (AUTH, DB, DASHBOARD)
              ────────────────────────────────────────────────────────────── */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="border-b border-crimson/15 pb-4">
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-crimson">
                      STEP 3 OF 6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-orbitron font-black uppercase text-white mt-1">
                      Technical Architecture & Controls
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      Configure authentication methods, database storage, dashboards, and integrations.
                    </p>
                  </div>

                  {/* 1. Authentication */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-crimson" />
                        User Authentication & Accounts
                      </label>
                      <span className="text-[10px] text-bright-red font-mono font-bold">
                        {formData.authOption !== "No Login Required" ? "+₹300" : "Included"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "No Login Required",
                        "Email + Password",
                        "Google Login",
                        "Phone OTP",
                        "Email OTP",
                        "Multiple Login Methods",
                      ].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, authOption: opt }))}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            formData.authOption === opt
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {formData.authOption !== "No Login Required" && (
                      <div className="pt-2">
                        <span className="text-[10px] font-orbitron uppercase text-[#777] block mb-2">
                          Security Add-ons:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Forgot Password",
                            "Email Verification",
                            "Two-Factor Authentication",
                            "Role-Based Access",
                            "Active Sessions Tracker",
                          ].map((extra) => {
                            const isChecked = formData.authExtras.includes(extra);
                            return (
                              <button
                                key={extra}
                                type="button"
                                onClick={() => toggleArrayItem("authExtras", extra)}
                                className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                                  isChecked
                                    ? "bg-crimson/30 border-bright-red text-white"
                                    : "bg-[#050505] border-white/5 text-[#777]"
                                }`}
                              >
                                {isChecked ? "✓ " : "+ "}
                                {extra}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Dashboards */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <LayoutDashboard className="w-3.5 h-3.5 text-crimson" />
                        Dashboard & Control Center
                      </label>
                      <span className="text-[10px] text-bright-red font-mono font-bold">
                        {formData.dashboardOption.includes("Admin") ? "+₹500" : formData.dashboardOption !== "No Dashboard" ? "+₹400" : "Included"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "No Dashboard",
                        "User Dashboard",
                        "Admin Dashboard",
                        "User + Admin Dashboard",
                        "Multi-role Dashboard",
                      ].map((dash) => (
                        <button
                          key={dash}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, dashboardOption: dash }))}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            formData.dashboardOption === dash
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {dash}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Database */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-crimson" />
                        Database Storage (Supabase / PostgreSQL)
                      </label>
                      <span className="text-[10px] text-bright-red font-mono font-bold">
                        {formData.databaseOption === "Yes" ? "+₹300" : "Included"}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      {["No", "Yes", "Not Sure"].map((dbOpt) => (
                        <button
                          key={dbOpt}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, databaseOption: dbOpt }))}
                          className={`flex-1 p-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                            formData.databaseOption === dbOpt
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {dbOpt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. External Integrations */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white block">
                      Third-Party Integrations Required
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INTEGRATION_OPTIONS.map((intg) => {
                        const isSelected = formData.integrations.includes(intg);
                        return (
                          <button
                            key={intg}
                            type="button"
                            onClick={() => toggleArrayItem("integrations", intg)}
                            className={`p-2 rounded-lg text-[11px] border text-left truncate transition-all ${
                              isSelected
                                ? "bg-crimson/25 border-bright-red text-white"
                                : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {intg}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 4: DESIGN STYLE, ANIMATION & SCOPE
              ────────────────────────────────────────────────────────────── */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="border-b border-crimson/15 pb-4">
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-crimson">
                      STEP 4 OF 6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-orbitron font-black uppercase text-white mt-1">
                      Design Aesthetic & Motion Depth
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      Choose your preferred visual styling, animations, page volume, and existing assets.
                    </p>
                  </div>

                  {/* Design Style Visual Cards */}
                  <div>
                    <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white block mb-3">
                      Visual Style Palettes (Select Multiple)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {DESIGN_STYLES.map((style) => {
                        const isSelected = formData.designStyles.includes(style.id);
                        return (
                          <div
                            key={style.id}
                            onClick={() => toggleArrayItem("designStyles", style.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-deep-red/25 border-bright-red shadow-neon scale-[1.02]"
                                : "bg-[#080808] border-white/5 hover:border-crimson/30 hover:bg-[#111]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-orbitron font-bold text-xs text-white">
                                {style.label}
                              </h4>
                              {isSelected && <Check className="w-3.5 h-3.5 text-bright-red" />}
                            </div>
                            <p className="text-[10px] text-[#777]">{style.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Animation Level */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                        Animation & Motion Fidelity
                      </label>
                      <span className="text-[10px] text-bright-red font-mono font-bold">
                        {formData.animationLevel === "Cinematic" ? "+₹500" : formData.animationLevel === "Advanced" ? "+₹300" : "Included"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "Minimal", desc: "Subtle fades & clicks" },
                        { id: "Standard", desc: "Smooth cards & scroll" },
                        { id: "Advanced", desc: "Parallax & micro-FX" },
                        { id: "Cinematic", desc: "3D & Spline / WebGL" },
                      ].map((anim) => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, animationLevel: anim.id }))}
                          className={`p-3 rounded-lg text-left border transition-all ${
                            formData.animationLevel === anim.id
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          <span className="font-orbitron font-bold text-xs block text-white">
                            {anim.id}
                          </span>
                          <span className="text-[9px] text-[#777] block mt-0.5">{anim.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page Volume */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white block">
                      Estimated Page Count / Architecture
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "1 Page (Single Landing)",
                        "2–5 Pages",
                        "6–10 Pages",
                        "11–20 Pages",
                        "20+ Pages",
                        "Dynamic Web Application",
                      ].map((pg) => (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, pageRange: pg }))}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            formData.pageRange === pg
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {pg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Existing Design Assets */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-3">
                    <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white block">
                      Do You Already Have a Design?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        "No — CodeXa should design everything",
                        "Yes — Figma Link Available",
                        "Yes — Reference Websites",
                        "Yes — Screenshot / Wireframes",
                      ].map((ds) => (
                        <button
                          key={ds}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, hasExistingDesign: ds }))}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            formData.hasExistingDesign === ds
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {ds}
                        </button>
                      ))}
                    </div>

                    {formData.hasExistingDesign !== "No — CodeXa should design everything" && (
                      <input
                        type="url"
                        value={formData.designLinks}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, designLinks: e.target.value }))
                        }
                        placeholder="Paste Figma / Reference URLs here..."
                        className="w-full bg-[#050505] border border-crimson/25 focus:border-bright-red rounded-lg p-2.5 text-xs text-white outline-none mt-2"
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 5: TIMELINE, BUDGET & CONTACT INFO
              ────────────────────────────────────────────────────────────── */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="border-b border-crimson/15 pb-4">
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-crimson">
                      STEP 5 OF 6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-orbitron font-black uppercase text-white mt-1">
                      Timeline, Budget & Contact Information
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      Provide your target timeline, total project budget estimate, and contact details.
                    </p>
                  </div>

                  {/* Target Timeline */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-2">
                    <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white block">
                      Target Delivery Timeline
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "Urgent (< 1 Week)",
                        "1–2 Weeks",
                        "2–4 Weeks",
                        "1–2 Months",
                        "Flexible Timeline",
                      ].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, timeline: t }))}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            formData.timeline === t
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimated Project Budget (Separate from Advance) */}
                  <div className="p-4 rounded-xl bg-[#090909] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                        Estimated Total Project Budget
                      </label>
                      <span className="text-[10px] text-[#888]">
                        (Advance booking deposit is credited toward this)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "Below ₹10,000",
                        "₹10,000–₹20,000",
                        "₹20,000–₹40,000",
                        "₹40,000–₹75,000",
                        "₹75,000+",
                        "Need CodeXa Recommendation",
                      ].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, budgetRange: b }))}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                            formData.budgetRange === b
                              ? "bg-deep-red/25 border-bright-red text-white shadow-neon"
                              : "bg-[#050505] border-white/5 text-[#888] hover:text-white"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                          }
                          placeholder="e.g. Arjun Kumar"
                          className="w-full bg-[#070707] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="e.g. arjun@techstartup.com"
                          className="w-full bg-[#070707] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-1">
                          Phone / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="e.g. +91 9876543210"
                          className="w-full bg-[#070707] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-1">
                          Company / Brand
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, company: e.target.value }))
                          }
                          placeholder="e.g. Nova Studios"
                          className="w-full bg-[#070707] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text block mb-1">
                          Preferred Contact
                        </label>
                        <select
                          value={formData.preferredContact}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, preferredContact: e.target.value }))
                          }
                          className="w-full bg-[#070707] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon"
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Email">Email</option>
                          <option value="Phone">Phone Call</option>
                        </select>
                      </div>
                    </div>

                    {/* Description Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-secondary-text">
                          Tell Us About Your Project Idea *
                        </label>
                        <span
                          className={`text-[10px] font-mono ${
                            formData.description.length >= 20 ? "text-emerald-400" : "text-[#777]"
                          }`}
                        >
                          {formData.description.length} / 20 min chars
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        required
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Explain what you want to build, user workflows, core features, or any specific requirements you have..."
                        className="w-full bg-[#070707] border border-crimson/25 focus:border-bright-red rounded-lg p-3 text-xs text-white outline-none focus:shadow-neon resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  STEP 6: REQUIREMENT SUMMARY & ADVANCE DEPOSIT
              ────────────────────────────────────────────────────────────── */}
              {currentStep === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="border-b border-crimson/15 pb-4">
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-emerald-400">
                      FINAL STEP 6 OF 6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-orbitron font-black uppercase text-white mt-1">
                      Project Application Summary
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      Review your technical configuration and deposit amount before checkout.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="p-5 rounded-xl bg-[#080808] border border-crimson/30 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] font-orbitron text-[#777] uppercase block">
                          Project Type
                        </span>
                        <span className="font-bold text-white uppercase text-xs">
                          {currentProjectTypeObj.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-orbitron text-[#777] uppercase block">
                          Target Timeline
                        </span>
                        <span className="font-bold text-white">{formData.timeline}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-orbitron text-[#777] uppercase block">
                          Client Budget
                        </span>
                        <span className="font-bold text-white">{formData.budgetRange}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-orbitron text-[#777] uppercase block">
                          Client
                        </span>
                        <span className="font-bold text-white">{formData.fullName || "—"}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3">
                      <span className="text-[9px] font-orbitron text-[#777] uppercase block mb-1.5">
                        Selected Features & Modules:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {advanceResult.breakdown.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-[#151515] border border-white/5 text-[10px] text-[#ccc]"
                          >
                            ✓ {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Advance Clarification Alert Box */}
                  <div className="p-4 rounded-xl bg-deep-red/15 border border-crimson/30 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-bright-red shrink-0 mt-0.5" />
                    <div className="text-xs text-[#CCC] leading-relaxed">
                      <strong className="text-white block font-orbitron text-[11px] uppercase mb-0.5">
                        Project Booking Advance Deposit (₹{advanceResult.finalAdvance.toLocaleString("en-IN")})
                      </strong>
                      This amount is an advance toward your project slot & technical architecture review. Final scope and total quotation will be confirmed after CodeXa conducts your detailed requirement review.
                    </div>
                  </div>

                  {/* Terms & Conditions Checkboxes */}
                  <div className="space-y-3 p-4 rounded-xl bg-[#080808] border border-white/5">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsInfoCorrect}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, termsInfoCorrect: e.target.checked }))
                        }
                        className="mt-1 w-4 h-4 accent-crimson rounded cursor-pointer"
                      />
                      <span className="text-xs text-[#AAA] select-none">
                        I confirm that the information provided is correct and accurately represents my project goals.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsAdvanceUnderstood}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            termsAdvanceUnderstood: e.target.checked,
                          }))
                        }
                        className="mt-1 w-4 h-4 accent-crimson rounded cursor-pointer"
                      />
                      <span className="text-xs text-[#AAA] select-none">
                        I understand this ₹{advanceResult.finalAdvance.toLocaleString("en-IN")} amount is an{" "}
                        <strong className="text-white">advance / project booking payment</strong>, not the complete project price.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsReviewUnderstood}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            termsReviewUnderstood: e.target.checked,
                          }))
                        }
                        className="mt-1 w-4 h-4 accent-crimson rounded cursor-pointer"
                      />
                      <span className="text-xs text-[#AAA] select-none">
                        I understand the final scope, delivery milestones, and total project quotation are finalized after technical review.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsPolicyAccepted}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            termsPolicyAccepted: e.target.checked,
                          }))
                        }
                        className="mt-1 w-4 h-4 accent-crimson rounded cursor-pointer"
                      />
                      <span className="text-xs text-[#AAA] select-none">
                        I have read and agree to the{" "}
                        <Link
                          href="/payment-policy"
                          target="_blank"
                          className="text-bright-red underline hover:text-white"
                        >
                          Booking Advance & Refund Policy
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  {/* Pay Trigger Button */}
                  <button
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={!allTermsAccepted || isSubmitting}
                    className="w-full py-4 px-6 rounded-xl font-orbitron font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 bg-gradient-to-r from-crimson to-bright-red text-white hover:shadow-neon disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        PROCESSING SECURE ORDER...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        PAY ₹{advanceResult.finalAdvance.toLocaleString("en-IN")} ADVANCE & SUBMIT
                      </>
                    )}
                  </button>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Bottom Wizard Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-crimson/15">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 rounded-lg border border-white/10 text-xs font-orbitron font-bold uppercase tracking-wider text-[#AAA] hover:text-white hover:border-crimson/30 transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 6 && (
                <NeonButton
                  variant="primary"
                  size="md"
                  onClick={handleNextStep}
                  className="text-xs"
                >
                  Continue to Next Step
                  <ArrowRight className="w-3.5 h-3.5" />
                </NeonButton>
              )}
            </div>

          </div>

          {/* Right Column: Live Floating Advance Calculator Widget (4 Cols) */}
          <div className="lg:col-span-4 sticky top-28 space-y-4">
            
            <div className="bg-[#0D0D0D]/95 border border-crimson/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              
              {/* Top Pulse Glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-bright-red/10 rounded-full blur-xl" />

              <div className="flex items-center justify-between pb-3 border-b border-crimson/15">
                <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#888]">
                  PROJECT BOOKING
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-orbitron font-bold uppercase border border-emerald-500/20">
                  Priority Slot
                </span>
              </div>

              {/* Dynamic Live Counter */}
              <div className="my-5 text-center py-3 bg-[#070707] rounded-xl border border-crimson/20">
                <span className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-[#777] block">
                  Advance Deposit Payable
                </span>
                <motion.div
                  key={advanceResult.finalAdvance}
                  initial={{ scale: 0.9, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-mono text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-bright-red to-white mt-1"
                >
                  ₹{advanceResult.finalAdvance.toLocaleString("en-IN")}
                </motion.div>
                <span className="text-[10px] text-[#666] block mt-1">
                  (Capped: ₹2,000 min &bull; ₹7,000 max)
                </span>
              </div>

              {/* Itemized Calculation Breakdown */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {advanceResult.breakdown.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 border-b border-white/5 text-[11px]"
                  >
                    <span className="text-[#AAA] truncate pr-2">{item.label}</span>
                    <span className="font-mono font-bold text-white shrink-0">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Capping Notice */}
              {advanceResult.isMaxCapped && (
                <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono text-center">
                  ⚡ Max advance cap of ₹7,000 applied.
                </div>
              )}

              {/* Razorpay Secured Badge */}
              <div className="mt-5 pt-3 border-t border-crimson/15 flex items-center justify-between text-[10px] text-[#777]">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <span className="font-orbitron text-bright-red font-bold">RAZORPAY</span>
              </div>

            </div>

            {/* Help Callout Card */}
            <div className="p-4 rounded-xl bg-[#090909] border border-white/5 text-xs text-[#888] space-y-2">
              <div className="flex items-center gap-2 text-white font-orbitron font-bold text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-crimson" />
                Have Custom Technical Needs?
              </div>
              <p className="text-[11px] leading-relaxed">
                Connect directly with CodeXa founder Ashu on WhatsApp at{" "}
                <a
                  href="https://wa.me/918897901413"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bright-red hover:underline"
                >
                  +91 8897901413
                </a>
                .
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#070707]/95 backdrop-blur-xl border-t border-crimson/30 p-4 flex items-center justify-between shadow-2xl">
        <div>
          <span className="text-[9px] font-orbitron uppercase text-[#888] block">Advance Booking</span>
          <span className="font-mono text-lg font-black text-bright-red">
            ₹{advanceResult.finalAdvance.toLocaleString("en-IN")}
          </span>
        </div>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-5 py-2.5 rounded-lg bg-crimson text-white font-orbitron font-bold text-xs uppercase tracking-wider shadow-neon"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInitiatePayment}
            disabled={!allTermsAccepted || isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-crimson to-bright-red text-white font-orbitron font-bold text-xs uppercase tracking-wider shadow-neon disabled:opacity-40"
          >
            {isSubmitting ? "Processing..." : "Pay Advance"}
          </button>
        )}
      </div>

      <Footer />
    </div>
  );
}
