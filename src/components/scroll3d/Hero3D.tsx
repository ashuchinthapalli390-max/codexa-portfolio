"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionTemplate, useReducedMotion, MotionValue } from "framer-motion";
import { ArrowDown, ArrowRight, Sparkles, Play } from "lucide-react";
import { siteConfig } from "@/config/site";
import { scrollToId } from "@/lib/scroll-store";
import { ScrollVideo } from "./ScrollVideo";

const EASE = [0.16, 1, 0.3, 1] as const;

function Letter({ ch, i, total, progress, ready }: { ch: string; i: number; total: number; progress: MotionValue<number>; ready: boolean }) {
  const spread = (i - (total - 1) / 2) / total;
  const y = useTransform(progress, [0, 0.45], [0, -120 - Math.abs(spread) * 260]);
  const z = useTransform(progress, [0, 0.45], [0, -500 + i * 40]);
  const rotX = useTransform(progress, [0, 0.45], [0, 70 + spread * 40]);
  const rotY = useTransform(progress, [0, 0.45], [0, spread * 120]);
  const opacity = useTransform(progress, [0.15, 0.42], [1, 0]);

  return (
    <motion.span style={{ y, z, rotateX: rotX, rotateY: rotY, opacity, display: "inline-block" }}>
      <motion.span
        className="inline-block"
        initial={{ opacity: 0, rotateX: -95, y: 70, filter: "blur(12px)" }}
        animate={ready ? { opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" } : undefined}
        transition={{ duration: 1.2, delay: 0.15 + i * 0.07, ease: EASE }}
        style={{ transformOrigin: "50% 100%" }}
      >
        {ch}
      </motion.span>
    </motion.span>
  );
}

export function Hero3D({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // text group recedes
  const textOpacity = useTransform(scrollYProgress, [0.05, 0.32], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.35], [0, -80]);

  // video portal: card → fullscreen → fade into the 3D flight
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const inset = useTransform(scrollYProgress, [0.08, 0.5], [1, 0]);
  const top = useTransform(inset, (v) => (mobile ? `${v * 100}%` : `${8 + v * 54}%`));
  const right = useTransform(inset, (v) => (mobile ? "0%" : `${v * 6}%`));
  const left = useTransform(inset, (v) => (mobile ? "0%" : `${v * 62}%`));
  const bottom = useTransform(inset, (v) => (mobile ? "0%" : `${v * 10}%`));
  const radius = useTransform(inset, (v) => `${v * 28}px`);
  const clip = useMotionTemplate`inset(${top} ${right} ${bottom} ${left} round ${radius})`;
  const vidScale = useTransform(scrollYProgress, [0.08, 0.5, 0.95], [1.35, 1, 1.12]);
  const vidRotY = useTransform(scrollYProgress, [0, 0.4], [-18, 0]);
  const portalOpacity = useTransform(scrollYProgress, [0, 0.04, 0.82, 0.98], [0.9, 1, 1, 0]);

  // overlay statement on the full-screen video
  const words = siteConfig.tagline.split(" ");
  const stmtOpacity = useTransform(scrollYProgress, [0.45, 0.55, 0.8, 0.92], [0, 1, 1, 0]);
  const stmtZ = useTransform(scrollYProgress, [0.45, 0.92], [-300, 160]);

  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const title = "CODEXA";

  return (
    <section id="home" ref={ref} className="relative h-[260vh]">
      <div className="sticky top-0 h-screen w-full overflow-clip">
        {/* Video portal */}
        <motion.div
          className="absolute inset-0 z-[1]"
          style={{ clipPath: reduced ? (mobile ? "inset(100% 0 0 0)" : "inset(62% 6% 10% 62% round 28px)") : clip, opacity: portalOpacity }}
        >
          <motion.div className="absolute inset-0" style={{ scale: vidScale, rotateY: vidRotY, transformPerspective: 1200 }}>
            <ScrollVideo name="hero-main" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
          <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,30,60,0.35)] rounded-[inherit]" />
        </motion.div>

        {/* Showreel label on the card */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="hidden sm:flex absolute z-[2] right-[8%] bottom-[13%] items-center gap-3 pointer-events-none"
        >
          <span className="w-10 h-10 rounded-full border border-white/50 flex items-center justify-center backdrop-blur-sm bg-black/30">
            <Play className="w-4 h-4 text-white fill-white" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">Scroll to enter the reel</span>
        </motion.div>

        {/* Statement over the full-bleed video */}
        <motion.div
          className="absolute inset-0 z-[3] flex items-center justify-center px-6 pointer-events-none"
          style={{ opacity: stmtOpacity, z: stmtZ, transformPerspective: 1000 }}
        >
          <h2 className="text-center font-orbitron font-black uppercase text-white text-4xl sm:text-6xl lg:text-8xl leading-[0.95] tracking-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            {words.map((w, i) => (
              <span key={i} className={`inline-block mx-2 ${i >= words.length - 2 ? "text-bright-red text-neon-glow" : ""}`}>
                {w}
              </span>
            ))}
          </h2>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative z-[4] h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end sm:justify-center pb-24 sm:pb-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.8, ease: EASE }}
            className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full border border-crimson/40 bg-black/40 backdrop-blur-md mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-white/85">
              {siteConfig.coreIdentity.join(" · ")} — Available for projects
            </span>
          </motion.div>

          <h1
            className="font-orbitron font-black uppercase leading-[0.85] tracking-tighter text-white text-[18vw] sm:text-[13vw] lg:text-[10.5rem]"
            style={{ perspective: 900 }}
            aria-label="CodeXa Agency"
          >
            <span className="block whitespace-nowrap" style={{ transformStyle: "preserve-3d" }}>
              {title.split("").map((ch, i) => (
                <Letter key={i} ch={ch} i={i} total={title.length} progress={scrollYProgress} ready={ready} />
              ))}
            </span>
            <motion.span
              initial={{ opacity: 0, x: -40 }}
              animate={ready ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 1, delay: 0.7, ease: EASE }}
              className="block text-[7vw] sm:text-[5vw] lg:text-[4.2rem] tracking-[0.35em] text-transparent [-webkit-text-stroke:1.5px_#FF1E3C] mt-2"
            >
              AGENCY
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
            className="mt-6 max-w-md text-sm sm:text-base text-white/70 leading-relaxed"
          >
            {siteConfig.tagline}. We engineer AI systems, cinematic web & mobile products and
            security-first platforms — from first idea to global deployment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/project-request"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-crimson px-7 py-3.5 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(217,4,41,0.45)] transition-shadow hover:shadow-[0_0_50px_rgba(255,30,60,0.7)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Sparkles className="w-4 h-4" />
              Start a Project
            </Link>
            <button
              onClick={() => scrollToId("about", !!reduced)}
              className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md transition-colors hover:border-bright-red hover:bg-crimson/10"
            >
              Explore
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href={siteConfig.internshipUrl}
              className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 underline decoration-crimson/60 underline-offset-8 hover:text-white"
            >
              Join Internship ↗
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: 1 } : undefined}
            transition={{ duration: 1, delay: 1.3 }}
            className="mt-10 hidden sm:grid grid-cols-4 max-w-lg border-t border-white/10 pt-5"
          >
            {siteConfig.brandPhrase.map((w, i) => (
              <div key={w}>
                <div className="font-mono text-[10px] text-bright-red tracking-widest">0{i + 1}</div>
                <div className="font-orbitron font-bold text-white text-sm tracking-wider">{w}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[5] hidden sm:flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/50">Scroll</span>
          <span className="relative h-10 w-[1px] overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-bright-red animate-[scrollcue_1.8s_ease-in-out_infinite]" />
          </span>
          <ArrowDown className="w-3 h-3 text-white/40" />
        </motion.div>
      </div>
    </section>
  );
}
