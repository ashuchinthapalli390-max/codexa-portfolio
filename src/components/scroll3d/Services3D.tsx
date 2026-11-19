"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Cpu, Globe, Smartphone, Layers, LayoutDashboard, Palette, Code2, Database, Zap,
  MessageSquareText, Cloud, ShieldAlert, ArrowUpRight, LucideIcon,
} from "lucide-react";
import { siteConfig } from "@/config/site";

const ICONS: Record<string, LucideIcon> = {
  Cpu, Globe, Smartphone, Layers, LayoutDashboard, Palette, Code2, Database, Zap, MessageSquareText, Cloud, ShieldAlert,
};

const N = siteConfig.services.length;
const STEP = 360 / N;

export function Services3D() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const rotateY = useTransform(scrollYProgress, [0.05, 0.95], [0, -STEP * (N - 1)]);
  const tilt = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [24, 8, 8, -10]);
  const ringScale = useTransform(scrollYProgress, [0, 0.1, 0.92, 1], [0.6, 1, 1, 0.7]);
  const ringOpacity = useTransform(scrollYProgress, [0, 0.06, 0.94, 1], [0, 1, 1, 0]);
  const bar = useTransform(scrollYProgress, [0.05, 0.95], ["0%", "100%"]);

  useMotionValueEvent(rotateY, "change", (v) => {
    const i = Math.round(-v / STEP);
    setActive(Math.max(0, Math.min(N - 1, i)));
  });

  const svc = siteConfig.services[active];

  return (
    <section id="services" ref={ref} className="relative h-[460vh]">
      <div className="sticky top-0 h-screen overflow-clip">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_55%,rgba(217,4,41,0.14),transparent_70%)]" />

        {/* header */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 flex items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-bright-red" />
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">02 — Services</span>
            </div>
            <h2 className="font-orbitron font-black uppercase text-white text-3xl sm:text-5xl lg:text-6xl leading-none tracking-tight">
              What we <span className="text-transparent [-webkit-text-stroke:1.5px_#FF1E3C]">engineer</span>
            </h2>
          </div>
          <div className="text-right hidden sm:block">
            <div className="font-orbitron font-black text-5xl text-white tabular-nums">
              {String(active + 1).padStart(2, "0")}
              <span className="text-white/25 text-2xl"> / {N}</span>
            </div>
            <div className="mt-3 h-[2px] w-40 bg-white/10 overflow-hidden ml-auto">
              <motion.div className="h-full bg-bright-red" style={{ width: bar }} />
            </div>
          </div>
        </div>

        {/* cylinder */}
        <div className="absolute inset-0 flex items-center justify-center pt-36 lg:pt-28" style={{ perspective: 1700 }}>
          <div className="scale-[0.55] sm:scale-[0.8] lg:scale-100" style={{ transformStyle: "preserve-3d" }}>
          <motion.div style={{ rotateX: tilt, scale: ringScale, opacity: ringOpacity, transformStyle: "preserve-3d" }} className="relative">
            <motion.div style={{ rotateY, transformStyle: "preserve-3d" }} className="relative w-[300px] h-[380px]">
              {siteConfig.services.map((s, i) => {
                const Icon = ICONS[s.icon] || Code2;
                const on = i === active;
                return (
                  <div
                    key={s.id}
                    className="absolute inset-0"
                    style={{ transform: `rotateY(${i * STEP}deg) translateZ(600px)`, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  >
                    <div
                      className={`h-full w-full rounded-3xl p-7 flex flex-col justify-between border transition-all duration-500 ${
                        on
                          ? "border-bright-red/70 bg-gradient-to-b from-crimson/25 via-[#0b0b0b]/90 to-[#060606]/95 shadow-[0_0_60px_rgba(255,30,60,0.35)]"
                          : "border-white/10 bg-[#0a0a0a]/70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${on ? "bg-crimson border-bright-red shadow-[0_0_30px_rgba(255,30,60,0.6)]" : "bg-white/5 border-white/10"}`}>
                          <Icon className={`w-6 h-6 ${on ? "text-white" : "text-bright-red"}`} />
                        </div>
                        <span className="font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <div>
                        <h3 className="font-orbitron font-black text-white uppercase text-xl leading-tight mb-3">{s.title}</h3>
                        <p className={`text-sm leading-relaxed ${on ? "text-white/75" : "text-white/40"}`}>{s.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">CodeXa // {s.id}</span>
                        <ArrowUpRight className={`w-4 h-4 ${on ? "text-bright-red" : "text-white/30"}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
          </div>
        </div>

        {/* active service caption (mobile + desktop) */}
        <div className="absolute bottom-8 inset-x-0 z-20 px-4 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
              transition={{ duration: 0.35 }}
              className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/60"
            >
              <span className="text-bright-red">{String(active + 1).padStart(2, "0")}</span> · {svc.title}
            </motion.div>
          </AnimatePresence>
          <Link
            href="/project-request"
            className="mt-4 inline-flex items-center gap-2 font-orbitron text-[11px] font-bold uppercase tracking-[0.25em] text-white border-b border-bright-red pb-1 hover:text-bright-red transition-colors"
          >
            Request this service <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
