/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface IntroFinalLockupProps {
  isExiting?: boolean;
}

const PILLARS = ["LEARN", "BUILD", "DEPLOY", "GROW"];

export function IntroFinalLockup({ isExiting = false }: IntroFinalLockupProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.02, filter: "blur(4px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center text-center p-8 sm:p-12 select-none max-w-xl mx-auto"
    >
      {/* 5. Glowing Thin Crimson Cyber Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="absolute inset-0 pointer-events-none rounded-2xl border border-[rgba(255,30,60,0.5)]"
        style={{
          boxShadow:
            "0 0 35px rgba(217, 4, 41, 0.25), inset 0 0 20px rgba(217, 4, 41, 0.1)",
        }}
      >
        {/* Corner Cyber Brackets */}
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#FF1E3C]" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#FF1E3C]" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#FF1E3C]" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#FF1E3C]" />
      </motion.div>

      {/* 1. CodeXa Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-[rgba(255,30,60,0.6)] bg-black overflow-hidden mb-4 shadow-[0_0_25px_rgba(217,4,41,0.4)]"
      >
        {!logoError ? (
          <img
            src="/assets/images/logo.jpeg"
            alt="CodeXa Agency"
            className="w-full h-full object-cover"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="font-orbitron font-black text-xl text-[#FF1E3C]">CX</span>
        )}
      </motion.div>

      {/* 2. Official Wordmark */}
      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-2xl sm:text-4xl font-black font-orbitron tracking-[0.2em] text-white mb-2"
        style={{ textShadow: "0 0 25px rgba(255,30,60,0.7)" }}
      >
        CODEXA AGENCY
      </motion.h2>

      {/* 3. Official Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-[11px] sm:text-xs font-orbitron uppercase tracking-[0.35em] text-[#D90429] mb-6"
      >
        Where Ideas Become Digital Reality
      </motion.p>

      {/* 4. Core Pillars: LEARN • BUILD • DEPLOY • GROW */}
      <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3">
        {PILLARS.map((pillar, idx) => (
          <React.Fragment key={pillar}>
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.08 }}
              className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-white/90 px-2 py-0.5 rounded bg-white/5 border border-white/10"
            >
              {pillar}
            </motion.span>
            {idx < PILLARS.length - 1 && (
              <span className="text-[#FF1E3C] text-[10px] select-none">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}
