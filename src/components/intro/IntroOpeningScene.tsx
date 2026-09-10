"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface IntroOpeningSceneProps {
  isReducedMotion?: boolean;
}

export function IntroOpeningScene({ isReducedMotion = false }: IntroOpeningSceneProps) {
  const [hudText, setHudText] = useState("CODEXA SYSTEM // INITIALIZING");

  useEffect(() => {
    const timer = setTimeout(() => {
      setHudText("SECURE EXPERIENCE CHANNEL // ACTIVE");
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* 1. Subtle cyber grid */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(217, 4, 41, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(217, 4, 41, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 2. Low-opacity scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0px, rgba(0, 0, 0, 0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* 3. Dark crimson radial center glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(217,4,41,0.18) 0%, rgba(99,0,15,0.06) 40%, transparent 75%)",
        }}
      />

      {/* 4. Thin crimson horizontal laser line expanding from center */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex items-center justify-center">
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: [0, 0.9, 0.5] }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(217,4,41,0.2) 20%, #FF1E3C 50%, rgba(217,4,41,0.2) 80%, transparent 100%)",
            boxShadow: "0 0 12px rgba(255, 30, 60, 0.8)",
          }}
        />
      </div>

      {/* 5. Minimal cyber particles moving slowly toward center (disabled if reduced motion) */}
      {!isReducedMotion && (
        <svg className="absolute inset-0 w-full h-full opacity-60">
          <circle cx="20%" cy="30%" r="1.5" fill="#FF1E3C" className="animate-pulse opacity-70" />
          <circle cx="80%" cy="25%" r="1.5" fill="#D90429" className="animate-pulse opacity-60" />
          <circle cx="15%" cy="75%" r="1" fill="#FF1E3C" className="animate-pulse opacity-50" />
          <circle cx="85%" cy="70%" r="2" fill="#D90429" className="animate-pulse opacity-70" />
          <circle cx="35%" cy="85%" r="1" fill="#FF1E3C" className="animate-pulse opacity-60" />
          <circle cx="65%" cy="15%" r="1.5" fill="#D90429" className="animate-pulse opacity-50" />
        </svg>
      )}

      {/* 6. Subtle Monospace System HUD Status */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="absolute top-6 left-6 sm:top-8 sm:left-10 flex items-center gap-2.5 text-[10px] sm:text-xs font-mono tracking-[0.2em] text-[#D90429]/80 uppercase"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E3C] animate-pulse shadow-[0_0_8px_#FF1E3C]" />
        <span>{hudText}</span>
      </motion.div>
    </div>
  );
}
