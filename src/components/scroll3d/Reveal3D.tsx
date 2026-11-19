"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Scroll-scrubbed 3D entrance: content tilts up from the floor as it enters.
 * When fully revealed the transform resolves to `none`, so `position: fixed`
 * modals inside keep working.
 */
export function Reveal3D({
  children,
  className = "",
  intensity = 1,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });

  const rotateX = useTransform(scrollYProgress, [0, 1], [22 * intensity, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [140 * intensity, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [0, 1]);
  const transformPerspective = useTransform(scrollYProgress, (v) => (v >= 0.999 ? 0 : 1400));

  if (reduced) return <div id={id} className={className}>{children}</div>;

  return (
    <div ref={ref} id={id} className={className}>
      <motion.div style={{ rotateX, y, scale, opacity, transformPerspective, transformOrigin: "50% 0%" }}>
        {children}
      </motion.div>
    </div>
  );
}

/** Opacity-only variant for sections that host fixed-position modals. */
export function RevealFade({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.4"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div ref={ref} style={{ opacity }} className={className}>
      {children}
    </motion.div>
  );
}
