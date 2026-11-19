"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ScrollVideo } from "./ScrollVideo";

const SKILLS = siteConfig.roadmap;
const STEP = 360 / 8; // 8 chips per turn

export function Internship3D() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const rotateY = useTransform(scrollYProgress, [0, 1], [30, -300]);
  const helixY = useTransform(scrollYProgress, [0, 1], [180, -SKILLS.length * 34 + 120]);
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 1, 0.6]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.25, 1]);

  return (
    <section id="internship" ref={ref} className="relative lg:h-[300vh]">
      <div className="lg:sticky top-0 lg:h-screen overflow-clip flex items-center py-24 lg:py-0">
        {/* faint video wash */}
        <motion.div className="absolute inset-0 opacity-[0.16]" style={{ scale: videoScale }}>
          <ScrollVideo name="internship-bg" className="grayscale" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-[#050505]/30" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-bright-red" />
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">06 — Internship</span>
            </div>
            <h2 className="font-orbitron font-black uppercase text-white text-4xl sm:text-6xl tracking-tight leading-[0.95]">
              Free <br />
              Developer <br />
              <span className="text-transparent [-webkit-text-stroke:1.5px_#FF1E3C]">Internship</span>
            </h2>
            <p className="mt-6 max-w-lg text-white/65 leading-relaxed">
              Learn real development skills, build production-grade projects and collaborate in structured teams.
              100% remote and self-paced — you get reviewed on actual project code, learn proper git workflows and
              leave with a premium portfolio.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={siteConfig.internshipUrl}
                className="group inline-flex items-center gap-2 rounded-full bg-crimson px-7 py-3.5 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(217,4,41,0.45)] hover:shadow-[0_0_50px_rgba(255,30,60,0.7)] transition-shadow"
              >
                <GraduationCap className="w-4 h-4" />
                Apply for Internship
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <span className="text-xs text-white/45 max-w-[240px] leading-snug">{siteConfig.internshipHelperText}</span>
            </div>

            {/* mobile chips */}
            <div className="mt-10 flex flex-wrap gap-2 lg:hidden" style={{ perspective: 800 }}>
              {SKILLS.map((s, i) => (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, rotateX: -80, y: 20 }}
                  whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.6 }}
                  className="px-3 py-1.5 rounded-full border border-crimson/30 bg-white/[0.03] font-orbitron text-[10px] uppercase tracking-wider text-white"
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </div>

          {/* helix (desktop) */}
          <div className="lg:col-span-6 hidden lg:flex justify-center h-[80vh] items-center" style={{ perspective: 1200 }}>
            <motion.div className="absolute w-64 h-64 rounded-full bg-crimson/30 blur-[100px]" style={{ opacity: glow }} />
            <div className="absolute w-[2px] h-full bg-gradient-to-b from-transparent via-bright-red/70 to-transparent" />
            <motion.div style={{ rotateY, y: helixY, rotateX: -12, transformStyle: "preserve-3d" }} className="relative w-0 h-0">
              {SKILLS.map((s, i) => (
                <div
                  key={s}
                  className="absolute left-0 top-0"
                  style={{ transform: `translateY(${i * 34}px) rotateY(${i * STEP}deg) translateZ(230px) translate(-50%, -50%)`, transformStyle: "preserve-3d" }}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full border border-crimson/40 bg-[#0b0b0b]/85 shadow-[0_0_20px_rgba(217,4,41,0.25)]">
                    <span className="font-mono text-[10px] text-bright-red">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-orbitron text-[11px] font-bold uppercase tracking-wider text-white">{s}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
