"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useVelocity, useSpring, MotionValue } from "framer-motion";
import { siteConfig } from "@/config/site";

const CAPS = siteConfig.capabilities;

function Row({ reverse, x, skew }: { reverse?: boolean; x: MotionValue<string>; skew: MotionValue<number> }) {
  const items = [...CAPS, ...CAPS, ...CAPS];
  return (
    <motion.div style={{ x, skewX: skew }} className={`flex gap-4 w-max ${reverse ? "pl-[20vw]" : ""}`}>
      {items.map((c, i) => (
        <span
          key={i}
          className={`shrink-0 inline-flex items-center gap-4 px-7 py-4 rounded-2xl border font-orbitron font-black uppercase tracking-wider text-xl sm:text-3xl ${
            i % 4 === 0
              ? "border-bright-red/60 bg-crimson/15 text-white shadow-[0_0_30px_rgba(217,4,41,0.25)]"
              : "border-white/10 bg-white/[0.03] text-white/70"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-bright-red shadow-[0_0_8px_#FF1E3C]" />
          {c}
        </span>
      ))}
    </motion.div>
  );
}

export function CapabilitiesMarquee() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress, scrollY } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const vel = useVelocity(scrollY);
  const skew = useSpring(useTransform(vel, [-2500, 2500], [12, -12]), { stiffness: 200, damping: 30 });
  const x1 = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-38%", "0%"]);
  const rotX = useTransform(scrollYProgress, [0, 0.5, 1], [42, 18, -10]);

  return (
    <section id="capabilities" ref={ref} className="relative py-28 sm:py-36 overflow-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">Capability matrix</span>
        <h2 className="mt-3 font-orbitron font-black uppercase text-white text-3xl sm:text-5xl tracking-tight">
          Everything your product needs
        </h2>
      </div>
      <div style={{ perspective: 1000 }}>
        <motion.div style={{ rotateX: rotX, rotateZ: -4, transformStyle: "preserve-3d" }} className="flex flex-col gap-4">
          <Row x={x1} skew={skew} />
          <Row x={x2} skew={skew} reverse />
        </motion.div>
      </div>
    </section>
  );
}
