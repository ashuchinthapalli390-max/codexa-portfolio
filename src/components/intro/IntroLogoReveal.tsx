/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface IntroLogoRevealProps {
  isExiting?: boolean;
}

export function IntroLogoReveal({ isExiting = false }: IntroLogoRevealProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.04, filter: "blur(4px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center select-none"
    >
      {/* 5. Soft Crimson Halo Behind Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 0.45, 0.3], scale: [0.8, 1.1, 1.0] }}
        transition={{ duration: 2.5, ease: "easeOut" }}
        className="absolute -inset-12 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 30, 60, 0.4) 0%, rgba(217, 4, 41, 0.15) 50%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      {/* Official CodeXa Circular Emblem */}
      <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-[rgba(255,30,60,0.6)] bg-[#0A0A0A] overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(217,4,41,0.45)]">
        {!logoError ? (
          <img
            src="/assets/images/logo.jpeg"
            alt="CodeXa Official Logo"
            className="w-full h-full object-cover"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="font-orbitron font-black text-4xl text-[#FF1E3C]">CX</span>
        )}

        {/* 6. Thin Diagonal Light Sweep Across Logo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.35) 50%, transparent 60%)",
            animation: "slowLightSweep 2.8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Wordmark under logo held together */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1.0 }}
        className="mt-6 font-orbitron font-black text-2xl sm:text-3xl tracking-[0.25em] text-white uppercase text-center"
        style={{ textShadow: "0 0 20px rgba(255,30,60,0.7)" }}
      >
        CODEXA AGENCY
      </motion.h2>

      <style jsx>{`
        @keyframes slowLightSweep {
          0% {
            transform: translateX(-160%) skewX(-20deg);
          }
          100% {
            transform: translateX(160%) skewX(-20deg);
          }
        }
      `}</style>
    </motion.div>
  );
}
