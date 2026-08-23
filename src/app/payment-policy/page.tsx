"use client";

import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, CheckCircle2, AlertCircle, FileText, CreditCard } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

export default function PaymentPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col selection:bg-crimson selection:text-white">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Top Back Link */}
        <Link
          href="/project-request"
          className="inline-flex items-center gap-2 text-xs font-orbitron font-bold uppercase tracking-wider text-crimson hover:text-bright-red mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project Application
        </Link>

        {/* Header */}
        <div className="border-b border-crimson/20 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-deep-red/20 border border-crimson/30 text-bright-red text-xs font-orbitron font-bold uppercase tracking-widest mb-4">
            <Shield className="w-3.5 h-3.5" />
            CodeXa Transparent Terms
          </div>
          <h1 className="text-3xl sm:text-4xl font-orbitron font-black uppercase tracking-wider text-white">
            Project Booking Advance & Refund Policy
          </h1>
          <p className="text-sm text-[#888888] mt-3 leading-relaxed">
            Effective Date: August 2026 &bull; CodeXa Agency Official Policy
          </p>
        </div>

        {/* Content Sections */}
        <div className="flex flex-col gap-8 text-sm text-[#CCCCCC] leading-relaxed font-light">
          
          {/* Section 1: Nature of Booking Advance */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border border-crimson/20 shadow-xl">
            <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-crimson" />
              1. Nature of the Advance Payment (₹2,000 – ₹7,000)
            </h2>
            <p className="mb-3">
              The payment made during the Project Application process represents a{" "}
              <strong className="text-white">Project Booking Deposit / Priority Engineering Queue Reservation</strong>.
            </p>
            <div className="p-4 rounded bg-[#070707] border border-white/5 text-xs text-[#A5A5A5] flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Not the Full Project Cost:</strong> The booking advance reserves dedicated engineering bandwidth and covers upfront technical scoping, architectural design, and roadmap formulation.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Directly Deducted from Milestones:</strong> 100% of this advance booking payment is credited toward your first formal development milestone upon contract confirmation.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Review & Final Quotation */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border border-white/10 shadow-xl">
            <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-crimson" />
              2. Technical Scope Review & Final Quotation
            </h2>
            <p className="mb-3">
              Upon receiving your application and confirmed deposit:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-[#A5A5A5]">
              <li>
                CodeXa senior technical leads review your architecture, feature requirements, third-party integrations, and timeline.
              </li>
              <li>
                We formulate a formal <strong className="text-white">Statement of Work (SOW)</strong>, containing exact milestone deliverables, total project investment, and delivery timeline.
              </li>
              <li>
                If your project requirements necessitate custom enterprise infrastructure or external API limits, these will be clearly outlined before contract signing.
              </li>
            </ul>
          </div>

          {/* Section 3: Refund & Cancellation Terms */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border border-crimson/20 shadow-xl">
            <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-bright-red" />
              3. Refund & Cancellation Terms
            </h2>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded bg-[#070707] border-l-2 border-emerald-500">
                <h3 className="font-orbitron font-bold text-white uppercase text-xs mb-1">
                  A. Inability to Accept by CodeXa (100% Full Refund)
                </h3>
                <p className="text-[#A5A5A5]">
                  If CodeXa is unable to accept your project due to capacity constraints, policy restrictions, or technical infeasibility, your advance booking deposit will be refunded <strong>in full (100%)</strong> within 3–5 business days to your original payment method.
                </p>
              </div>

              <div className="p-4 rounded bg-[#070707] border-l-2 border-amber-500">
                <h3 className="font-orbitron font-bold text-white uppercase text-xs mb-1">
                  B. Client Cancellation Before Scope Approval (100% Full Refund)
                </h3>
                <p className="text-[#A5A5A5]">
                  If you decide not to proceed with the project before approving the final technical scope quotation, you are eligible for a full refund upon written notice within 7 days of submission.
                </p>
              </div>

              <div className="p-4 rounded bg-[#070707] border-l-2 border-crimson">
                <h3 className="font-orbitron font-bold text-white uppercase text-xs mb-1">
                  C. Cancellation After Architecture Work Commences
                </h3>
                <p className="text-[#A5A5A5]">
                  Once the final statement of work is approved and active code engineering commences, milestone fees are governed by the formal project contract.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Contact & Inquiries */}
          <div className="p-6 rounded-xl bg-[#0D0D0D] border border-white/10 text-xs text-[#888888]">
            <h2 className="text-sm font-orbitron font-bold uppercase tracking-wider text-white mb-2">
              Questions Regarding Payments?
            </h2>
            <p>
              For any payment inquiries or status updates on your transaction, reach out to our executive support team at{" "}
              <a href="mailto:contact@codxa-agency.online" className="text-bright-red hover:underline">
                contact@codxa-agency.online
              </a>{" "}
              or via WhatsApp at +91 8897901413 with your Reference ID.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
