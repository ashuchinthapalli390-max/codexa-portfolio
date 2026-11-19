"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/** Fly-through title that introduces the leadership section. */
export function TeamIntro3D() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const z = useTransform(scrollYProgress, [0, 1], [-900, 650]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.25, 0.8, 1], ["blur(14px)", "blur(0px)", "blur(0px)", "blur(10px)"]);
  const subO = useTransform(scrollYProgress, [0.3, 0.45, 0.7, 0.85], [0, 1, 1, 0]);
  const lineScale = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);

  return (
    <div ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen overflow-clip flex items-center justify-center" style={{ perspective: 900 }}>
        <motion.div style={{ z, opacity, filter: blur }} className="text-center px-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-bright-red mb-5">04 — Leadership</div>
          <h2 className="font-orbitron font-black uppercase text-white text-[13vw] sm:text-[9vw] leading-[0.85] tracking-tighter">
            The minds
            <br />
            <span className="text-transparent [-webkit-text-stroke:2px_#FF1E3C]">behind</span> CodeXa
          </h2>
        </motion.div>
        <motion.div style={{ scaleX: lineScale }} className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-[40vw] h-px bg-gradient-to-r from-transparent via-bright-red to-transparent" />
        <motion.p style={{ opacity: subO }} className="absolute bottom-[14%] max-w-md text-center px-6 text-sm text-white/60">
          Founders, engineers and strategists turning bold ideas into production systems.
        </motion.p>
      </div>
    </div>
  );
}
