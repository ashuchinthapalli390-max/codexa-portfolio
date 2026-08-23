"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Home,
  MessageSquare,
  ShieldCheck,
  Clock,
  Sparkles,
  Printer,
  Calendar,
  Layers,
  FileCheck,
} from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { NeonButton } from "@/components/ui/NeonButton";

export default function ProjectApplicationSuccessPage() {
  const params = useParams();
  const referenceId = params?.referenceId as string;

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applicationData, setApplicationData] = useState<any>(null);

  useEffect(() => {
    if (referenceId) {
      fetch(`/api/project-applications/${referenceId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.application) {
            setApplicationData(data.application);
          }
        })
        .catch((err) => console.error("Error fetching application details:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [referenceId]);

  const handleCopyRef = () => {
    if (referenceId && typeof window !== "undefined") {
      navigator.clipboard.writeText(referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const advanceAmount = applicationData?.finalAdvance || 4500;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-crimson selection:text-white relative overflow-hidden">
      <Navbar />

      {/* Glowing Backdrop Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-crimson/5 rounded-full blur-[140px]" />
      </div>

      <main className="flex-grow pt-32 pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        
        {/* Main Success Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="p-6 sm:p-10 rounded-3xl bg-[#0B0B0B]/90 border border-emerald-500/30 backdrop-blur-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] text-center relative"
        >
          {/* Top Corner Cyber Indicators */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-500" />

          {/* Glowing Animated Success Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          >
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-orbitron font-bold uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            PAYMENT VERIFIED &bull; PROJECT APPLICATION SECURED
          </div>

          <h1 className="text-2xl sm:text-4xl font-orbitron font-black uppercase tracking-wider text-white">
            ₹{advanceAmount.toLocaleString("en-IN")} Advance Received
          </h1>

          <p className="text-xs sm:text-sm text-[#A5A5A5] max-w-lg mx-auto mt-2 leading-relaxed">
            Your project booking has been confirmed and placed in CodeXa’s{" "}
            <strong className="text-emerald-400">Priority Engineering Queue</strong>.
          </p>

          {/* Reference ID Copy Widget */}
          <div className="my-8 p-4 rounded-2xl bg-[#050505] border border-emerald-500/30 max-w-md mx-auto flex items-center justify-between gap-3 shadow-inner">
            <div className="text-left">
              <span className="text-[10px] font-orbitron uppercase text-[#777] tracking-wider block">
                Project Reference ID
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-emerald-400">
                {referenceId || "CXA-PRJ-2026-CONFIRMED"}
              </span>
            </div>
            <button
              onClick={handleCopyRef}
              className="px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#202020] border border-white/10 text-xs font-orbitron font-bold uppercase tracking-wider text-[#CCC] hover:text-white transition-all flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* What Happens Next 3-Step Timeline */}
          <div className="p-6 rounded-2xl bg-[#070707] border border-white/5 text-left mb-8 space-y-4">
            <h2 className="text-xs font-orbitron font-bold uppercase tracking-widest text-white border-b border-white/5 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              What Happens Next?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0F0F0F] border border-white/5">
                <span className="w-5 h-5 rounded-full bg-crimson text-white text-[10px] font-orbitron font-bold flex items-center justify-center mb-2">
                  1
                </span>
                <h3 className="font-orbitron font-bold text-white text-xs mb-1">
                  Architecture Review
                </h3>
                <p className="text-[11px] text-[#888] leading-relaxed">
                  Our core engineers will analyze your specifications, feature matrix, and design preferences within 24 hours.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F0F0F] border border-white/5">
                <span className="w-5 h-5 rounded-full bg-crimson text-white text-[10px] font-orbitron font-bold flex items-center justify-center mb-2">
                  2
                </span>
                <h3 className="font-orbitron font-bold text-white text-xs mb-1">
                  Scope & Milestone Quote
                </h3>
                <p className="text-[11px] text-[#888] leading-relaxed">
                  We will transmit a detailed Statement of Work (SOW) with milestone breakdowns. Your booking deposit is deducted directly.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F0F0F] border border-white/5">
                <span className="w-5 h-5 rounded-full bg-crimson text-white text-[10px] font-orbitron font-bold flex items-center justify-center mb-2">
                  3
                </span>
                <h3 className="font-orbitron font-bold text-white text-xs mb-1">
                  Development Kickoff
                </h3>
                <p className="text-[11px] text-[#888] leading-relaxed">
                  Upon approval, active development sprints commence with live staging previews and direct engineer communication.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <NeonButton variant="primary" size="md" className="text-xs">
                <Home className="w-4 h-4" />
                Return to Homepage
              </NeonButton>
            </Link>

            <a
              href={`https://wa.me/918897901413?text=Hi%20CodeXa%2C%20I%20have%20submitted%20project%20advance%20payment.%20My%20Reference%20ID%20is%20${referenceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-[#111] hover:bg-[#1A1A1A] border border-emerald-500/30 text-emerald-400 hover:text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat on WhatsApp
            </a>

            <button
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="px-4 py-3 rounded-xl bg-[#0D0D0D] hover:bg-[#151515] border border-white/10 text-xs font-orbitron font-bold uppercase tracking-wider text-[#888] hover:text-white transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Save Receipt
            </button>
          </div>

        </motion.div>

      </main>

      <Footer />
    </div>
  );
}
