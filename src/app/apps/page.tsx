"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  Monitor,
  Download,
  Sparkles,
  ShieldCheck,
  Cpu,
  Key,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Lock,
  Terminal,
  Radio,
  Clock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AppsPage() {
  const { user } = useAuth();
  const [mobileConfig, setMobileConfig] = useState<any>(null);
  const [desktopAccess, setDesktopAccess] = useState<any>(null);

  useEffect(() => {
    // Load authoritative public mobile release config
    fetch("/api/mobile/public-config")
      .then((res) => res.json())
      .then((pub) => {
        if (pub && pub.ok && pub.version) {
          setMobileConfig({
            currentVersion: pub.version.latest || "1.0.0",
            downloadUrl: pub.version.downloadUrl || "/downloads/CodeXa.apk",
            releaseNotes: pub.version.releaseNotes,
          });
        }
      })
      .catch(() => {
        setMobileConfig({
          currentVersion: "1.0.0",
          downloadUrl: "/downloads/CodeXa.apk",
        });
      });

    if (user) {
      fetch("/api/apps/desktop-licenses")
        .then((res) => res.json())
        .then((data) => {
          if (data.license) setDesktopAccess(data.license);
        })
        .catch(() => {});
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-crimson selection:text-white">
      {/* Background Cyber Accents */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-crimson/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[300px] bg-purple-600/5 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f10_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f10_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
          >
            &larr; Back to Agency Home
          </Link>
          {user ? (
            <Link
              href="/dashboard/apps"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white hover:border-crimson/40 transition-all"
            >
              <Key className="w-3.5 h-3.5 text-bright-red" />
              Manage Device Activation
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-xs font-mono text-bright-red hover:bg-crimson hover:text-white transition-all"
            >
              Sign In to Check Entitlements
            </Link>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-bright-red text-xs font-mono uppercase tracking-widest">
            <Cpu className="w-3.5 h-3.5" /> CodeXa Ecosystem Suite
          </div>
          <h1 className="text-4xl sm:text-6xl font-orbitron font-black uppercase tracking-wider text-white">
            CODEXA <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson to-bright-red">APPLICATIONS</span>
          </h1>
          <p className="text-neutral-400 font-sans text-sm sm:text-base leading-relaxed">
            One CodeXa Account connects your daily agency workspace, autonomous AI engines, and management command center across Mobile and Desktop.
          </p>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Card 1: CodeXa Mobile */}
          <div className="relative rounded-3xl bg-neutral-900/60 border border-neutral-800 hover:border-crimson/40 p-8 sm:p-10 backdrop-blur-xl transition-all group flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-crimson/15 border border-crimson/30 flex items-center justify-center text-bright-red group-hover:scale-105 transition-transform">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono uppercase tracking-widest">
                    In Production Rollout
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-orbitron font-bold text-white group-hover:text-bright-red transition-colors">
                  CodeXa Mobile
                </h2>
                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-1">
                  Daily Team Workspace & Attendance Client
                </p>
              </div>

              <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                The daily companion for CodeXa crew and interns. Mark attendance during active windows, engage in end-to-end encrypted direct messaging, share project milestones, and receive instant push updates.
              </p>

              {/* Highlights */}
              <div className="space-y-2.5 text-xs font-sans text-neutral-300 border-t border-neutral-800/80 pt-5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>One-tap Attendance Marking during scheduled sessions</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Role-governed Team DMs & Project Collaboration groups</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time Push Notifications for Payroll, Leaves & Milestones</span>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Platform</span>
                  <span className="text-white font-bold">Android (APK)</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Version</span>
                  <span className="text-white font-bold">{mobileConfig?.currentVersion || "1.0.0"}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">iOS Link</span>
                  <span className="text-neutral-400">Q1 2027</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800/80 mt-6 space-y-3">
              <Link
                href="/mobile"
                className="w-full py-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700/80 text-white text-xs font-orbitron font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:border-crimson/50"
              >
                <Sparkles className="w-4 h-4 text-bright-red" /> View Full Showcase & Screenshots &rarr;
              </Link>
              {mobileConfig?.downloadUrl ? (
                <a
                  href={mobileConfig.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-crimson/25 transition-all"
                >
                  <Download className="w-4 h-4" /> Download APK ({mobileConfig.currentVersion})
                </a>
              ) : (
                <div className="w-full py-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-bright-red" />
                  Official APK Rollout (Available via Internal Hub)
                </div>
              )}
            </div>
          </div>

          {/* Card 2: CodeXa AI Desktop */}
          <div className="relative rounded-3xl bg-neutral-900/60 border border-neutral-800 hover:border-crimson/40 p-8 sm:p-10 backdrop-blur-xl transition-all group flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Monitor className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-mono uppercase tracking-widest">
                    Licensed Developer Suite
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-orbitron font-bold text-white group-hover:text-purple-400 transition-colors">
                  CodeXa AI Desktop
                </h2>
                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-1">
                  Autonomous AI Models & Developer Workspace
                </p>
              </div>

              <p className="text-sm text-neutral-400 leading-relaxed font-sans">
                The high-performance workstation client for engineers and agency leadership. Access autonomous coding models, document synthesis pipelines, and agency dev tools with cryptographic device binding.
              </p>

              {/* Highlights */}
              <div className="space-y-2.5 text-xs font-sans text-neutral-300 border-t border-neutral-800/80 pt-5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Integrated Coding AI & Architectural Reasoning Models</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Hardware-Bound Device Activation with CXA-DESK Keys</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>User-Tailored Daily Token Allocations & Request Limits</span>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Platform</span>
                  <span className="text-white font-bold">Windows x64</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Version</span>
                  <span className="text-white font-bold">1.0.0-Preview</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">macOS / Linux</span>
                  <span className="text-neutral-400">Roadmap</span>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-800/80 mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono px-1">
                <span className="text-neutral-400">License Requirement:</span>
                <span className="text-purple-400 font-bold">CodeXa Device Key Required</span>
              </div>
              {user ? (
                <Link
                  href="/dashboard/apps"
                  className="w-full py-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-orbitron font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-neutral-700"
                >
                  <Key className="w-4 h-4 text-purple-400" />
                  {desktopAccess ? "View My Activation Key" : "Request Desktop License"}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="w-full py-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/40 text-neutral-300 hover:text-white text-xs font-orbitron font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <Lock className="w-4 h-4 text-neutral-500" /> Login to Check License Status
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Architecture Note */}
        <div className="rounded-3xl bg-neutral-950 border border-neutral-800/80 p-8 text-center max-w-3xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-bright-red text-xs font-mono uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Unified Security Architecture
          </div>
          <h3 className="text-lg font-orbitron font-bold text-white">
            One CodeXa Account &bull; One Central Database
          </h3>
          <p className="text-xs text-neutral-400 font-sans leading-relaxed">
            All CodeXa applications operate over the same high-security database, unified permissions system, and persistent session infrastructure. Your credentials grant tailored permissions across Web Portal, Mobile Client, and Desktop Developer Environment.
          </p>
        </div>
      </div>
    </div>
  );
}
