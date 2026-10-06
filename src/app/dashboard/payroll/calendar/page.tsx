"use client";

import React from "react";
import Link from "next/link";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { Calendar, Clock, CheckCircle2, ArrowLeft, ShieldCheck, DollarSign, AlertCircle } from "lucide-react";

export default function PayrollCalendarPage() {
  const scheduleMilestones = [
    {
      date: "01 Oct 2026",
      title: "Attendance Cycle Commenced",
      description: "Daily attendance marking window initialized for all active employees and interns.",
      completed: true,
      phase: "PHASE 1: ATTENDANCE TRACKING",
    },
    {
      date: "25 Oct 2026",
      title: "Attendance Calculation Closes",
      description: "Final monthly attendance percentages calculated. Minimum 75% requirement evaluated for payroll eligibility.",
      completed: false,
      current: true,
      phase: "PHASE 2: ELIGIBILITY AUDIT",
    },
    {
      date: "28 Oct 2026",
      title: "Payroll Ledger Generated",
      description: "Automated aggregation of base salary/stipend, performance bonuses, allowances, and deductions.",
      completed: false,
      phase: "PHASE 3: LEDGER COMPUTATION",
    },
    {
      date: "30 Oct 2026",
      title: "HR Verification Window",
      description: "HR management conducts staff audit, verifies deductions, and validates attendance dispute resolutions.",
      completed: false,
      phase: "PHASE 4: HR COMPLIANCE",
    },
    {
      date: "01 Nov 2026",
      title: "Founder & Co-Founder Final Approval",
      description: "Executive review and cryptographic sign-off of monthly banking payout batches.",
      completed: false,
      phase: "PHASE 5: EXECUTIVE APPROVAL",
    },
    {
      date: "05 Nov 2026",
      title: "Official Disbursement Date",
      description: "Direct bank transfer settlements executed and official downloadable payslips released in portal.",
      completed: false,
      highlight: true,
      phase: "PHASE 6: DISBURSEMENT",
    },
  ];

  return (
    <TeamCoreShell
      title="Salary & Stipend Calendar"
      subtitle="Official CodeXa monthly compensation cycle and disbursement milestones"
      actions={
        <Link
          href="/dashboard/payroll"
          className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Payroll
        </Link>
      }
    >
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Next Payment Card */}
        <div className="rounded-3xl bg-neutral-900/80 border border-crimson/30 p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(217,4,41,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-bright-red font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Upcoming Agency Settlement
            </span>
            <h2 className="text-2xl font-orbitron font-black text-white uppercase tracking-wider">
              October 2026 Cycle
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              Next scheduled payout date for all verified core engineers and interns.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-right shrink-0">
            <span className="text-[10px] font-mono text-neutral-500 uppercase block">Disbursement Date</span>
            <span className="text-xl font-orbitron font-bold text-emerald-400 block mt-0.5">
              05 November 2026
            </span>
            <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
              Target Settlement: 11:00 AM IST
            </span>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800 p-6 sm:p-8 backdrop-blur-xl space-y-8">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <Calendar className="w-5 h-5 text-bright-red" />
            <h3 className="text-base font-orbitron font-bold uppercase tracking-wider text-white">
              6-Stage Monthly Operational Timeline
            </h3>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-800">
            {scheduleMilestones.map((m, idx) => (
              <div key={idx} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-[19px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    m.completed
                      ? "bg-emerald-500 border-emerald-400 text-black"
                      : m.current
                      ? "bg-bright-red border-white text-white animate-pulse"
                      : m.highlight
                      ? "bg-neutral-900 border-emerald-500 text-emerald-400"
                      : "bg-neutral-900 border-neutral-700 text-neutral-500"
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>

                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    m.current
                      ? "bg-crimson/10 border-crimson/50"
                      : m.highlight
                      ? "bg-neutral-950 border-emerald-500/40"
                      : "bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-bright-red font-bold">
                      {m.phase}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-neutral-900 px-2.5 py-0.5 rounded-full border border-neutral-800 self-start sm:self-auto">
                      {m.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-orbitron font-bold text-white mt-1">
                    {m.title}
                  </h4>
                  <p className="text-xs text-neutral-400 font-sans mt-1 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TeamCoreShell>
  );
}
