"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, MotionValue } from "framer-motion";
import { Lightbulb, Paintbrush, Terminal, Activity, Send, LifeBuoy, LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/site";

const ICONS: Record<string, LucideIcon> = { Lightbulb, Paintbrush, Terminal, Activity, Send, LifeBuoy };
const STEPS = siteConfig.process;
const N = STEPS.length;

const CODE: string[][] = [
  ["scope.define({ goals, users })", "arch.blueprint()", "→ roadmap.ready"],
  ["ui.wireframe(flows)", "theme.apply('crimson/cyber')", "→ prototype.motion"],
  ["git checkout -b feature/core", "api.connect(db, ai)", "→ sprint.ship()"],
  ["test.run --e2e --perf", "audit.security()", "→ all checks passed"],
  ["build --prod", "deploy --edge --ssl", "→ live in production"],
  ["monitor.watch(uptime)", "deps.update()", "→ scale.next()"],
];

function StepCard({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const s = STEPS[i];
  const Icon = ICONS[s.icon] || Terminal;
  const seg = 1 / N;
  const start = i * seg;
  const depth = N - 1 - i;
  const y = useTransform(progress, (v) => {
    const enter = i === 0 ? 1 : Math.min(1, Math.max(0, (v - (start - seg)) / seg));
    const eased = 1 - Math.pow(1 - enter, 3);
    const span = 1 - (start + seg);
    const push = span > 0 ? Math.min(1, Math.max(0, (v - (start + seg)) / span)) : 0;
    return `${(1 - eased) * 120 - push * depth * 5}%`;
  });
  const rotX = useTransform(progress, [Math.max(0, start - seg), start], i === 0 ? [0, 0] : [-38, 0]);
  const scale = useTransform(progress, [start + seg, 1], [1, 1 - depth * 0.045]);
  const shade = useTransform(progress, [start + seg, Math.min(1, start + seg * 2.2)], [0, 0.55]);

  return (
    <motion.div
      style={{ y, rotateX: rotX, scale, zIndex: i, transformOrigin: "50% 0%" }}
      className="absolute inset-0"
    >
      <div className="relative h-full w-full rounded-[26px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#141414] via-[#0b0b0b] to-[#070707] shadow-[0_-20px_80px_-20px_rgba(217,4,41,0.35)]">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-crimson/20 blur-[90px]" />
        <div className="relative h-full grid sm:grid-cols-2 gap-6 p-7 sm:p-10">
          <div className="flex flex-col justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-crimson flex items-center justify-center shadow-[0_0_35px_rgba(255,30,60,0.55)]">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/45">Phase {s.step}</span>
            </div>
            <div>
              <h3 className="font-orbitron font-black uppercase text-white text-4xl sm:text-5xl tracking-tight">{s.title}</h3>
              <p className="mt-4 text-sm sm:text-base text-white/60 leading-relaxed max-w-md">{s.description}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center">
            <div className="w-full rounded-2xl border border-white/10 bg-black/60 p-5 font-mono text-[12px] leading-7">
              <div className="flex gap-1.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-bright-red" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              </div>
              {CODE[i].map((l, k) => (
                <div key={k} className={k === CODE[i].length - 1 ? "text-emerald-400" : "text-white/70"}>
                  <span className="text-bright-red/70 mr-2">{k === CODE[i].length - 1 ? "✓" : "$"}</span>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
        <motion.div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: shade }} />
      </div>
    </motion.div>
  );
}

export function Process3D() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useTransform(scrollYProgress, [0.04, 0.96], [0, 1]);
  useMotionValueEvent(p, "change", (v) => setActive(Math.min(N - 1, Math.floor(v * N + 0.15))));

  return (
    <section id="process" ref={ref} className="relative h-[560vh]">
      <div className="sticky top-0 h-screen overflow-clip flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-bright-red" />
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">05 — Process</span>
            </div>
            <h2 className="font-orbitron font-black uppercase text-white text-3xl sm:text-5xl tracking-tight leading-none">
              Idea to <br />
              <span className="text-bright-red text-neon-glow">Production</span>
            </h2>
            <ol className="mt-10 hidden lg:flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li key={s.step} className="flex items-center gap-4">
                  <span className={`font-mono text-xs transition-colors ${i === active ? "text-bright-red" : "text-white/25"}`}>{s.step}</span>
                  <span className={`h-px transition-all duration-500 ${i === active ? "w-12 bg-bright-red" : "w-5 bg-white/15"}`} />
                  <span className={`font-orbitron text-sm uppercase tracking-widest transition-colors ${i === active ? "text-white" : "text-white/30"}`}>{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-8">
            <div className="relative mt-10 lg:mt-0 h-[54vh] sm:h-[48vh] lg:h-[52vh]" style={{ perspective: 1500 }}>
              {STEPS.map((_, i) => (
                <StepCard key={i} i={i} progress={p} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
