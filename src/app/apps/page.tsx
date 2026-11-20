"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Smartphone, Monitor, Download, CheckCircle2, Key, Lock, ArrowUpRight, Globe, Sparkles, LogIn, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageShell } from "@/components/site/PageShell";
import { PageHero, CtaBand } from "@/components/site/PageHero";

type MobileConfig = { currentVersion: string; downloadUrl: string; releaseNotes?: string };

const EASE = [0.16, 1, 0.3, 1] as const;

export default function AppsPage() {
  const { user } = useAuth();
  const [mobileConfig, setMobileConfig] = useState<MobileConfig | null>(null);
  const [desktopAccess, setDesktopAccess] = useState<unknown>(null);

  useEffect(() => {
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
      .catch(() => setMobileConfig({ currentVersion: "1.0.0", downloadUrl: "/downloads/CodeXa.apk" }));

    if (user) {
      fetch("/api/apps/desktop-licenses")
        .then((res) => res.json())
        .then((data) => {
          if (data.license) setDesktopAccess(data.license);
        })
        .catch(() => {});
    }
  }, [user]);

  const version = mobileConfig?.currentVersion || "1.0.0";

  return (
    <PageShell>
      <PageHero
        eyebrow="CodeXa Apps"
        title="One account. *Every* device."
        subtitle="Your CodeXa account connects the web portal, the mobile crew app and the AI desktop workspace — same login, same permissions, one secure backend."
        crumbs={[{ label: "Home", href: "/" }, { label: "Apps" }]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <a href="#mobile" className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
            <Smartphone className="w-4 h-4" /> Mobile app
          </a>
          <a href="#desktop" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition">
            <Monitor className="w-4 h-4" /> Desktop
          </a>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-widest ${user ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-white/50"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${user ? "bg-emerald-400" : "bg-white/40"}`} />
            {user ? `Signed in as ${user.username || "member"}` : "Not signed in"}
          </span>
        </div>
      </PageHero>

      {/* ── Mobile ── */}
      <ProductSection
        id="mobile"
        index="01"
        badge="Android · In production"
        icon={<Smartphone className="w-5 h-5" />}
        name="CodeXa Mobile"
        tagline="Daily team workspace & attendance"
        description="The daily companion for the CodeXa crew and interns. Mark attendance during live windows, message your team, follow project milestones and get instant updates."
        features={[
          "One-tap attendance during scheduled sessions",
          "Role-based team DMs & project groups",
          "Push notifications for payroll, leave & milestones",
        ]}
        specs={[
          { k: "Platform", v: "Android (APK)" },
          { k: "Version", v: version },
          { k: "iOS", v: "Q1 2027" },
        ]}
        visual={<PhoneMockup />}
        actions={
          <>
            {mobileConfig?.downloadUrl ? (
              <a
                href={mobileConfig.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3.5 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(217,4,41,0.45)] transition"
              >
                <Download className="w-4 h-4" /> Download APK · v{version}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3.5 font-mono text-[11px] uppercase tracking-widest text-white/55">
                APK rollout via the internal hub
              </span>
            )}
            <Link href="/mobile" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition">
              Screenshots & details <ArrowUpRight className="w-4 h-4" />
            </Link>
          </>
        }
        note={mobileConfig?.releaseNotes}
      />

      {/* ── Desktop ── */}
      <ProductSection
        id="desktop"
        index="02"
        reverse
        badge="Windows · Licensed preview"
        icon={<Monitor className="w-5 h-5" />}
        name="CodeXa AI Desktop"
        tagline="AI models & developer workspace"
        description="The workstation client for engineers and leadership: coding AI, document pipelines and agency dev tools, secured with hardware-bound device activation."
        features={[
          "Integrated coding AI & architecture reasoning",
          "Device activation with CXA-DESK keys",
          "Per-user daily token allocations & limits",
        ]}
        specs={[
          { k: "Platform", v: "Windows x64" },
          { k: "Version", v: "1.0.0-Preview" },
          { k: "macOS / Linux", v: "Roadmap" },
        ]}
        visual={<LaptopMockup />}
        actions={
          user ? (
            <Link href="/dashboard/apps" className="inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-white/90 px-6 py-3.5 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] transition">
              <Key className="w-4 h-4" /> {desktopAccess ? "View my activation key" : "Request desktop license"}
            </Link>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-white text-black hover:bg-white/90 px-6 py-3.5 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] transition">
              <Lock className="w-4 h-4" /> Log in to check license
            </Link>
          )
        }
        note="A CodeXa device key is required to activate the desktop app."
      />

      {/* ── How access works ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">How it works</div>
          <h2 className="mt-4 font-orbitron font-black uppercase text-white text-3xl sm:text-4xl tracking-tight">Get access in three steps</h2>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-3" style={{ perspective: 1400 }}>
          {[
            { icon: LogIn, t: "Sign in", d: "Use your CodeXa account — the same one you use for the web portal." },
            { icon: Key, t: "Request access", d: "Mobile is open to members. Desktop needs a license request from your dashboard." },
            { icon: ShieldCheck, t: "Activate & go", d: "Install the app, sign in and your role-based permissions sync automatically." },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.t}
                initial={{ opacity: 0, rotateX: 40, y: 60 }}
                whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
                className="relative rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md p-7"
              >
                <span className="absolute top-6 right-6 font-orbitron font-black text-5xl text-white/[0.06]">0{i + 1}</span>
                <div className="w-12 h-12 rounded-2xl bg-crimson/15 border border-crimson/40 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-bright-red" />
                </div>
                <h3 className="mt-6 font-orbitron font-bold uppercase text-white tracking-wider">{s.t}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{s.d}</p>
              </motion.li>
            );
          })}
        </ol>

        {/* ecosystem diagram */}
        <div className="mt-16 rounded-[28px] border border-white/[0.08] bg-[#0a0a0a]/70 backdrop-blur-md p-8 sm:p-12">
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6 md:gap-4">
            <EcoNode icon={<Globe className="w-5 h-5" />} title="Web portal" text="Dashboard, payments, projects" />
            <Connector />
            <div className="relative mx-auto">
              <div className="absolute inset-0 rounded-full bg-crimson/40 blur-2xl animate-pulse-slow" />
              <div className="relative w-36 h-36 rounded-full border border-bright-red/60 bg-[#0b0b0b] flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(217,4,41,0.35)]">
                <Sparkles className="w-5 h-5 text-bright-red" />
                <span className="mt-2 font-orbitron font-black text-xs uppercase tracking-wider text-white">One CodeXa<br />account</span>
              </div>
            </div>
            <Connector />
            <div className="grid gap-3">
              <EcoNode icon={<Smartphone className="w-5 h-5" />} title="Mobile" text="Attendance & team chat" />
              <EcoNode icon={<Monitor className="w-5 h-5" />} title="Desktop" text="AI workspace" />
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-white/50 max-w-2xl mx-auto">
            All apps run on the same secure database, permission system and session infrastructure — your role decides what you can see on every device.
          </p>
        </div>
      </section>

      <CtaBand title="Need a custom app like this?" text="We build mobile, desktop and web apps on one secure backend — tell us about yours." />
    </PageShell>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function ProductSection({
  id, index, badge, icon, name, tagline, description, features, specs, visual, actions, note, reverse,
}: {
  id: string;
  index: string;
  badge: string;
  icon: React.ReactNode;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  specs: { k: string; v: string }[];
  visual: React.ReactNode;
  actions: React.ReactNode;
  note?: string;
  reverse?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotY = useTransform(scrollYProgress, [0, 0.5, 1], reverse ? [28, -6, -24] : [-28, 6, 24]);
  const rotX = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -10]);
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);

  return (
    <section id={id} ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 scroll-mt-20">
      <div className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center`}>
        <div className={reverse ? "lg:order-2" : ""}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-bright-red">{index}</span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 font-mono text-[10px] uppercase tracking-widest text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {badge}
            </span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-crimson/15 border border-crimson/40 flex items-center justify-center text-bright-red">{icon}</div>
            <div>
              <h2 className="font-orbitron font-black uppercase text-white text-3xl sm:text-4xl tracking-tight">{name}</h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">{tagline}</p>
            </div>
          </div>
          <p className="mt-6 text-white/65 leading-relaxed max-w-xl">{description}</p>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle2 className="w-4 h-4 text-bright-red shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
          <dl className="mt-8 grid grid-cols-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] divide-x divide-white/[0.08]">
            {specs.map((s) => (
              <div key={s.k} className="px-4 py-3">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.k}</dt>
                <dd className="mt-1 text-sm font-semibold text-white">{s.v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
          {note && <p className="mt-4 text-xs text-white/40 max-w-md">{note}</p>}
        </div>

        <div className={`flex justify-center ${reverse ? "lg:order-1" : ""}`} style={{ perspective: 1400 }}>
          <motion.div style={{ rotateY: rotY, rotateX: rotX, y, transformStyle: "preserve-3d" }}>{visual}</motion.div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[250px] sm:w-[290px]" style={{ transformStyle: "preserve-3d" }}>
      <div className="absolute inset-x-6 -bottom-10 h-16 rounded-full bg-crimson/40 blur-3xl" />
      <div className="relative rounded-[44px] p-2.5 bg-gradient-to-b from-[#2a2a2a] to-[#0d0d0d] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9),0_0_60px_rgba(217,4,41,0.25)]">
        <div className="relative rounded-[36px] overflow-hidden aspect-[9/16] bg-black">
          <img src="/appstore/screenshot-1.png" alt="CodeXa Mobile app preview" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-black" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent pointer-events-none" />
        </div>
      </div>
      <div className="absolute -left-12 top-24 px-3 py-2 rounded-xl glass-panel font-mono text-[10px] uppercase tracking-widest text-white/80" style={{ transform: "translateZ(80px)" }}>
        <span className="text-emerald-400">●</span> Attendance marked
      </div>
      <div className="absolute -right-10 bottom-28 px-3 py-2 rounded-xl glass-panel font-mono text-[10px] uppercase tracking-widest text-white/80" style={{ transform: "translateZ(110px)" }}>
        3 new messages
      </div>
    </div>
  );
}

function LaptopMockup() {
  const lines = [
    { c: "text-white/40", t: "// codexa-ai · workspace" },
    { c: "text-sky-300", t: "const agent = codexa.connect({ device: 'CXA-DESK' })" },
    { c: "text-white/80", t: "await agent.plan('secure payments module')" },
    { c: "text-emerald-300", t: "✓ architecture drafted · 6 files" },
    { c: "text-white/80", t: "await agent.review({ security: true })" },
    { c: "text-emerald-300", t: "✓ 0 critical issues" },
  ];
  return (
    <div className="relative w-[320px] sm:w-[480px]" style={{ transformStyle: "preserve-3d" }}>
      <div className="absolute inset-x-10 -bottom-8 h-14 rounded-full bg-crimson/30 blur-3xl" />
      <div className="rounded-t-2xl p-2.5 bg-gradient-to-b from-[#2a2a2a] to-[#121212] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
        <div className="rounded-lg overflow-hidden aspect-[16/10] bg-[#07070a] border border-white/5">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
            <span className="w-2 h-2 rounded-full bg-bright-red" />
            <span className="w-2 h-2 rounded-full bg-white/20" />
            <span className="w-2 h-2 rounded-full bg-white/20" />
            <span className="ml-3 font-mono text-[9px] text-white/40">CodeXa AI Desktop</span>
          </div>
          <div className="grid grid-cols-[70px_1fr] sm:grid-cols-[90px_1fr] h-[calc(100%-29px)]">
            <div className="border-r border-white/5 p-2 space-y-1.5">
              {["Chat", "Code", "Docs", "Keys"].map((x, i) => (
                <div key={x} className={`px-2 py-1 rounded font-mono text-[9px] ${i === 1 ? "bg-crimson/30 text-white" : "text-white/40"}`}>{x}</div>
              ))}
            </div>
            <div className="p-3 font-mono text-[9px] sm:text-[11px] leading-5 sm:leading-6">
              {lines.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.25 }}
                  className={`${l.c} truncate`}
                >
                  {l.t}
                </motion.div>
              ))}
              <span className="inline-block w-1.5 h-3 bg-bright-red animate-pulse mt-1" />
            </div>
          </div>
        </div>
      </div>
      <div className="h-3 mx-[-6%] rounded-b-xl bg-gradient-to-b from-[#3a3a3a] to-[#151515]" />
      <div className="absolute -right-8 top-6 px-3 py-2 rounded-xl glass-panel font-mono text-[10px] uppercase tracking-widest text-white/80" style={{ transform: "translateZ(90px)" }}>
        <span className="text-bright-red">🔒</span> Device bound
      </div>
    </div>
  );
}

function EcoNode({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="w-10 h-10 rounded-xl bg-crimson/15 border border-crimson/40 flex items-center justify-center text-bright-red shrink-0">{icon}</div>
      <div>
        <div className="font-orbitron font-bold uppercase text-white text-sm tracking-wider">{title}</div>
        <div className="text-xs text-white/50">{text}</div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="hidden md:block w-16 h-px relative overflow-hidden bg-white/10">
      <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-bright-red to-transparent animate-[shimmer_2s_linear_infinite]" />
    </div>
  );
}
