"use client";

import React from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  badge?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  badge,
  align = "center",
  className = "",
}: SectionHeadingProps) {
  const isReduced = useReducedMotion();

  const alignmentStyles = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  };

  const lineAlignmentStyles = {
    left: "origin-left",
    center: "mx-auto origin-center",
    right: "origin-right",
  };

  const initial = isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 };
  const animate = { opacity: 1, y: 0 };
  const transition = { duration: 0.6, ease: "easeOut" };

  return (
    <div className={`flex flex-col ${alignmentStyles[align]} mb-12 ${className}`}>
      {badge && (
        <motion.span
          initial={initial}
          whileInView={animate}
          viewport={{ once: true, margin: "-10%" }}
          transition={transition}
          className="text-xs uppercase tracking-[0.25em] text-bright-red font-orbitron font-bold mb-3 px-3 py-1 rounded bg-deep-red/20 border border-crimson/30"
        >
          {badge}
        </motion.span>
      )}
      
      <motion.h2
        initial={initial}
        whileInView={animate}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ ...transition, delay: 0.1 }}
        className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white max-w-4xl"
      >
        {title}
      </motion.h2>

      {/* Futuristic line accent */}
      <motion.div
        initial={isReduced ? { width: "80px" } : { width: 0 }}
        whileInView={{ width: "120px" }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className={`h-[3px] bg-gradient-to-r from-crimson to-bright-red mt-4 ${lineAlignmentStyles[align]}`}
      />

      {subtitle && (
        <motion.p
          initial={initial}
          whileInView={animate}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ ...transition, delay: 0.3 }}
          className="text-secondary-text text-sm md:text-base max-w-2xl mt-4 leading-relaxed font-sans"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
