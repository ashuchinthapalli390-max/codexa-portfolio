"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { PublicLeadershipSection } from "@/components/sections/PublicLeadershipSection";

export default function TeamDirectoryPage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      <CyberWebOverlay />

      {/* Top Header */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-orbitron uppercase"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <span className="font-orbitron font-black text-sm text-white tracking-[0.2em]">
            CODEXA <span className="text-crimson text-xs font-normal">LEADERSHIP & TEAM</span>
          </span>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)]"
        >
          Team Core
        </Link>
      </header>

      {/* Main Canonical Leadership Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 z-10">
        <PublicLeadershipSection />
      </main>
    </div>
  );
}
