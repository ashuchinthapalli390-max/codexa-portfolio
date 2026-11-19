"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, MotionValue } from "framer-motion";
import { Cpu, Globe, Smartphone, Layers, ShieldAlert, Cloud, Zap, MessageSquare, Terminal } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ScrollVideo } from "./ScrollVideo";
import { TiltCard } from "./TiltCard";

const STATEMENT =
  "We don’t just build websites. We engineer digital ecosystems for creators, businesses, communities and the next generation of developers — fast, secure and built to scale.";
const HOT_WORDS = new Set(["ecosystems", "creators,", "developers", "secure", "scale."]);

const CAPS = [
  { title: "AI Products", icon: Cpu, d: "Agents, custom neural pipelines and automation flows." },
  { title: "Web Applications", icon: Globe, d: "High-performance, cinematic, responsive frontends." },
  { title: "Mobile Apps", icon: Smartphone, d: "Fluid cross-platform interfaces for iOS & Android." },
  { title: "Full Stack", icon: Layers, d: "Scalable APIs on clean relational databases." },
  { title: "Cybersecurity", icon: ShieldAlert, d: "Audits, vulnerability checks and access control." },
  { title: "Cloud & Hosting", icon: Cloud, d: "Server configs, CDN, edge routing and cloud tooling." },
  { title: "Automation", icon: Zap, d: "Scripts, scraper pipelines and system automation." },
  { title: "Discord Systems", icon: MessageSquare, d: "Moderation bots, chat nodes and subscriptions." },
  { title: "Developer Tools", icon: Terminal, d: "IDE add-ons, packages and CLI utilities." },
];

const STATS = [
  { n: siteConfig.services.length, suffix: "", label: "Service lines" },
  { n: siteConfig.process.length, suffix: "", label: "Phase delivery system" },
  { n: siteConfig.roadmap.length, suffix: "", label: "Internship skill tracks" },
  { n: 100, suffix: "%", label: "Remote internship" },
];

function Word({ word, range, progress }: { word: string; range: [number, number]; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  const y = useTransform(progress, range, [18, 0]);
  const rotX = useTransform(progress, range, [-70, 0]);
  const hot = HOT_WORDS.has(word);
  return (
    <motion.span
      style={{ opacity, y, rotateX: rotX, display: "inline-block", transformOrigin: "50% 100%" }}
      className={`mr-[0.28em] ${hot ? "text-bright-red text-neon-glow" : "text-white"}`}
    >
      {word}
    </motion.span>
  );
}

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1600);
      setV(Math.round(to * (1 - Math.pow(1 - t, 4))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref}>
      {String(v).padStart(2, "0")}
      {suffix}
    </span>
  );
}

export function Manifesto3D() {
  const pinRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });
  const words = STATEMENT.split(" ");

  const monoRotY = useTransform(scrollYProgress, [0, 1], [-38, 32]);
  const monoRotX = useTransform(scrollYProgress, [0, 1], [10, -6]);
  const monoScale = useTransform(scrollYProgress, [0, 0.3, 1], [0.8, 1, 1.05]);
  const monoY = useTransform(scrollYProgress, [0, 1], [80, -60]);
  const labelX = useTransform(scrollYProgress, [0, 1], ["0%", "-35%"]);

  return (
    <section id="about" className="relative">
      {/* ── pinned manifesto ── */}
      <div ref={pinRef} className="relative h-[280vh]">
        <div className="sticky top-0 h-screen overflow-clip flex items-center">
          {/* giant drifting outline label */}
          <motion.div
            style={{ x: labelX }}
            className="absolute top-[9%] left-0 whitespace-nowrap font-orbitron font-black uppercase text-[22vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,30,60,0.14)] select-none pointer-events-none"
          >
            About CodeXa — About CodeXa
          </motion.div>

          <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-6">
                <span className="h-px w-10 bg-bright-red" />
                <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">01 — About Agency</span>
              </div>
              <p
                className="font-orbitron font-bold text-[1.65rem] sm:text-4xl lg:text-[2.9rem] leading-[1.15] tracking-tight"
                style={{ perspective: 800 }}
              >
                {words.map((w, i) => {
                  const s = 0.05 + (i / words.length) * 0.75;
                  return <Word key={i} word={w} range={[s, s + 0.08]} progress={scrollYProgress} />;
                })}
              </p>
            </div>

            {/* rotating video monolith */}
            <div className="lg:col-span-5 hidden md:flex justify-center" style={{ perspective: 1300 }}>
              <motion.div
                style={{ rotateY: monoRotY, rotateX: monoRotX, scale: monoScale, y: monoY, transformStyle: "preserve-3d" }}
                className="relative w-[300px] lg:w-[360px] aspect-[3/4.3]"
              >
                <div className="absolute inset-0 rounded-[28px] overflow-hidden border border-crimson/40 shadow-[0_40px_120px_-20px_rgba(217,4,41,0.55)]">
                  <ScrollVideo name="about-divider" className="scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] mix-blend-multiply" />
                  <div className="absolute bottom-0 inset-x-0 p-6">
                    <div className="font-mono text-[10px] tracking-[0.3em] text-bright-red uppercase mb-2">{"// Core directive"}</div>
                    <div className="font-orbitron font-black text-2xl text-white uppercase leading-tight">
                      Learn. Build.<br />Deploy. Grow.
                    </div>
                  </div>
                </div>
                {/* floating depth layers */}
                <div className="absolute -left-10 top-10 px-3 py-2 rounded-lg glass-panel font-mono text-[10px] text-white/80 uppercase tracking-widest" style={{ transform: "translateZ(80px)" }}>
                  <span className="text-emerald-400">●</span> system.online
                </div>
                <div className="absolute -right-8 bottom-28 px-3 py-2 rounded-lg glass-panel font-mono text-[10px] text-white/80 uppercase tracking-widest" style={{ transform: "translateZ(120px)" }}>
                  secure.channel <span className="text-bright-red">✓</span>
                </div>
                {/* reflection */}
                <div
                  className="absolute left-0 right-0 -bottom-[46%] h-[42%] rounded-[28px] opacity-25 blur-[2px] overflow-hidden pointer-events-none"
                  style={{ transform: "scaleY(-1)", maskImage: "linear-gradient(to top, black, transparent 70%)", WebkitMaskImage: "linear-gradient(to top, black, transparent 70%)" }}
                >
                  <ScrollVideo name="about-divider" className="scale-110" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── capability cards flying in from depth ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ perspective: 1400 }}>
          {CAPS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, rotateX: 55, z: -420, y: 80 }}
                whileInView={{ opacity: 1, rotateX: 0, z: 0, y: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={{ duration: 1.1, delay: (i % 3) * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <TiltCard className="h-full rounded-2xl">
                  <div className="h-full rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.06] to-white/[0.01] backdrop-blur-md p-6 hover:border-bright-red/50 transition-colors" style={{ transform: "translateZ(0)" }}>
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-12 h-12 rounded-xl bg-crimson/15 border border-crimson/40 flex items-center justify-center shadow-[0_0_25px_rgba(217,4,41,0.25)]" style={{ transform: "translateZ(40px)" }}>
                        <Icon className="w-5 h-5 text-bright-red" />
                      </div>
                      <span className="font-mono text-[10px] text-white/30 tracking-widest">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="font-orbitron font-bold text-white uppercase tracking-wider text-sm mb-2" style={{ transform: "translateZ(30px)" }}>
                      {c.title}
                    </h3>
                    <p className="text-sm text-white/55 leading-relaxed">{c.d}</p>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>

        {/* stats */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.07]">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, rotateY: -80 }}
              whileInView={{ opacity: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformPerspective: 900 }}
              className="bg-[#070707]/85 p-6 sm:p-8"
            >
              <div className="font-orbitron font-black text-4xl sm:text-5xl text-white">
                <Counter to={s.n} suffix={s.suffix} />
              </div>
              <div className="mt-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-white/50">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
