"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Compass, GraduationCap, ShieldCheck, Code2 } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PageHero, CtaBand } from "@/components/site/PageHero";
import { PublicLeadershipSection } from "@/components/sections/PublicLeadershipSection";
import { TiltCard } from "@/components/scroll3d/TiltCard";
import { siteConfig } from "@/config/site";

const PRINCIPLES = [
  { icon: Compass, title: "Founder-led delivery", text: "Every engagement is overseen by our leadership — from scoping to launch." },
  { icon: Code2, title: "Engineers who ship", text: "We build production systems, not prototypes: tested, documented and deployed." },
  { icon: ShieldCheck, title: "Security by default", text: "Auth, access control and audits are part of the build, never an afterthought." },
  { icon: GraduationCap, title: "We grow developers", text: "Our internship turns learners into contributors on real CodeXa codebases." },
];

export default function TeamPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Our Team"
        title="The people behind *CodeXa*"
        subtitle="Founders, engineers and strategists who turn ambitious ideas into secure, production-ready digital systems."
        crumbs={[{ label: "Home", href: "/" }, { label: "Team" }]}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#leadership" className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
            Meet leadership
          </a>
          <a href="#join" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition">
            Join the team
          </a>
        </div>
      </PageHero>

      {/* principles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ perspective: 1400 }}>
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, rotateY: -50, z: -200 }}
                whileInView={{ opacity: 1, rotateY: 0, z: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <TiltCard className="h-full rounded-3xl">
                  <div className="h-full rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md p-6">
                    <div className="w-11 h-11 rounded-2xl bg-crimson/15 border border-crimson/40 flex items-center justify-center" style={{ transform: "translateZ(30px)" }}>
                      <Icon className="w-5 h-5 text-bright-red" />
                    </div>
                    <h3 className="mt-6 font-orbitron font-bold uppercase text-white text-sm tracking-wider">{p.title}</h3>
                    <p className="mt-2 text-sm text-white/55 leading-relaxed">{p.text}</p>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* canonical leadership (API-driven, includes profile modals) */}
      <div className="scene-panel">
        <PublicLeadershipSection />
      </div>

      {/* join */}
      <section id="join" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-24">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">Join CodeXa</div>
            <h2 className="mt-4 font-orbitron font-black uppercase text-white text-3xl sm:text-5xl tracking-tight leading-[0.95]">
              Learn here. <br />
              <span className="text-transparent [-webkit-text-stroke:1.5px_#FF1E3C]">Build</span> here.
            </h2>
            <p className="mt-5 text-white/60 leading-relaxed">
              Our free, remote developer internship is how most of our team starts. Work on real projects, get code reviews
              and grow into a CodeXa contributor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={siteConfig.internshipUrl} className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
                Apply for internship <ArrowUpRight className="w-4 h-4" />
              </a>
              <Link href="/login" className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white underline underline-offset-8 decoration-crimson">
                Already a member? Log in
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/40">{siteConfig.internshipHelperText}</p>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-[28px] border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md p-6 sm:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-5">What you&apos;ll learn</div>
              <div className="flex flex-wrap gap-2" style={{ perspective: 800 }}>
                {siteConfig.roadmap.map((s, i) => (
                  <motion.span
                    key={s}
                    initial={{ opacity: 0, rotateX: -90, y: 10 }}
                    whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.035 }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] font-orbitron text-[11px] font-semibold uppercase tracking-wider text-white/85"
                  >
                    <span className="font-mono text-[10px] text-bright-red">{String(i + 1).padStart(2, "0")}</span>
                    {s}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBand title="Work with this team" text="Bring us your idea — our leadership will personally review your requirements." />
    </PageShell>
  );
}
