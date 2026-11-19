"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { ScrollVideo } from "./ScrollVideo";

const PANELS = [
  { video: "team-intro", word: "Learn", tag: "Mentorship", text: "A structured, remote developer internship where real skills are built on real codebases." },
  { video: "hero-alt", word: "Build", tag: "Engineering", text: "Full-stack products, AI agents and admin systems engineered in clean, modular sprints." },
  { video: "security-bg", word: "Secure", tag: "Cybersecurity", text: "Hardened auth, RBAC, encryption and audits — security is designed in, never bolted on." },
  { video: "services-bg", word: "Deploy", tag: "Cloud & Edge", text: "Global CDN, edge runtimes, CI/CD pipelines and zero-downtime production rollouts." },
  { video: "internship-bg", word: "Grow", tag: "Scale", text: "Monitoring, iteration and new capability — systems that keep compounding value." },
];

function Panel({ p, i, n, progress }: { p: (typeof PANELS)[number]; i: number; n: number; progress: MotionValue<number> }) {
  const c = i / (n - 1);
  const w = 0.32;
  const rotateY = useTransform(progress, [c - w, c, c + w], [32, 0, -32]);
  const scale = useTransform(progress, [c - w, c, c + w], [0.8, 1, 0.8]);
  const z = useTransform(progress, [c - w, c, c + w], [-220, 0, -220]);
  const vidX = useTransform(progress, [c - w, c + w], ["-12%", "12%"]);
  const textY = useTransform(progress, [c - w, c, c + w], [60, 0, -60]);
  const textO = useTransform(progress, [c - w * 0.7, c, c + w * 0.7], [0, 1, 0]);
  const dim = useTransform(progress, [c - w, c, c + w], [0.75, 0.15, 0.75]);

  return (
    <motion.article
      style={{ rotateY, scale, z, transformStyle: "preserve-3d" }}
      className="relative shrink-0 w-[84vw] sm:w-[62vw] lg:w-[54vw] h-[62vh] sm:h-[68vh] rounded-[28px] overflow-hidden border border-white/10 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]"
    >
      <motion.div className="absolute inset-[-8%]" style={{ x: vidX }}>
        <ScrollVideo name={p.video} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: dim }} />

      <div className="absolute top-5 left-6 right-6 flex justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">
        <span>
          <span className="text-bright-red">●</span> REC · {p.tag}
        </span>
        <span>{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
      </div>

      <motion.div style={{ y: textY, opacity: textO }} className="absolute bottom-0 inset-x-0 p-6 sm:p-10">
        <h3 className="font-orbitron font-black uppercase text-white leading-none text-[16vw] sm:text-[9vw] lg:text-[7.5rem] tracking-tighter">
          {p.word}
          <span className="text-bright-red">.</span>
        </h3>
        <p className="mt-3 max-w-md text-sm sm:text-base text-white/75 leading-relaxed">{p.text}</p>
      </motion.div>

      <div className="absolute inset-0 rounded-[28px] pointer-events-none shadow-[inset_0_0_0_1px_rgba(255,30,60,0.25)]" />
    </motion.article>
  );
}

export function CinematicReel() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useEffect(() => {
    const measure = () => {
      const el = track.current;
      if (!el) return;
      setDist(Math.max(0, el.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const x = useTransform(scrollYProgress, [0.08, 0.92], [0, -dist]);
  const panelProgress = useTransform(scrollYProgress, [0.08, 0.92], [0, 1]);
  const headO = useTransform(scrollYProgress, [0, 0.08, 0.9, 1], [0, 1, 1, 0]);

  return (
    <section id="reel" ref={ref} className="relative h-[520vh]">
      <div className="sticky top-0 h-screen overflow-clip flex flex-col justify-center">
        <motion.div style={{ opacity: headO }} className="absolute top-24 sm:top-28 inset-x-0 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-10 bg-bright-red" />
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">03 — Showreel</span>
            </div>
            <h2 className="font-orbitron font-black uppercase text-white text-2xl sm:text-4xl tracking-tight">The CodeXa cycle</h2>
          </div>
          <div className="hidden sm:flex gap-1.5">
            {PANELS.map((_, i) => (
              <ReelDot key={i} i={i} n={PANELS.length} progress={panelProgress} />
            ))}
          </div>
        </motion.div>

        <div className="mt-16" style={{ perspective: 1600 }}>
          <motion.div ref={track} style={{ x, transformStyle: "preserve-3d" }} className="flex gap-[4vw] px-[8vw] sm:px-[19vw] lg:px-[23vw] w-max items-center">
            {PANELS.map((p, i) => (
              <Panel key={p.video} p={p} i={i} n={PANELS.length} progress={panelProgress} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ReelDot({ i, n, progress }: { i: number; n: number; progress: MotionValue<number> }) {
  const c = i / (n - 1);
  const width = useTransform(progress, [c - 0.18, c, c + 0.18], [10, 36, 10]);
  const bg = useTransform(progress, [c - 0.18, c, c + 0.18], ["rgba(255,255,255,0.25)", "rgba(255,30,60,1)", "rgba(255,255,255,0.25)"]);
  return <motion.span style={{ width, backgroundColor: bg }} className="h-[3px] rounded-full block" />;
}
