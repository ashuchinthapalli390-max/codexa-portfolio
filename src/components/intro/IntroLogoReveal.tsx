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
      initial={{ opacity: 0, scale: 0.82, filter: "blur(8px)" }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.04, filter: "blur(4px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center select-none"
    >
      {/* Soft Red Halo Behind Logo */}
      <div
        className="absolute -inset-10 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 30, 60, 0.35) 0%, rgba(217, 4, 41, 0.15) 50%, transparent 70%)",
          filter: "blur(24px)",
          animation: "pulse 2.5s ease-in-out infinite",
        }}
      />

      {/* Official CodeXa Circular Emblem */}
      <div
        className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-[rgba(255,30,60,0.6)] bg-[#0A0A0A] overflow-hidden flex items-center justify-center shadow-[0_0_35px_rgba(217,4,41,0.4)]"
      >
        {!logoError ? (
          <img
            src="/assets/images/logo.jpeg"
            alt="CodeXa Official Logo"
            className="w-full h-full object-cover"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="font-orbitron font-black text-3xl text-[#FF1E3C]">CX</span>
        )}

        {/* Subtle Diagonal Light Sweep Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)",
            animation: "lightSweep 1.6s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes lightSweep {
          0% {
            transform: translateX(-150%) skewX(-20deg);
          }
          100% {
            transform: translateX(150%) skewX(-20deg);
          }
        }
      `}</style>
    </motion.div>
  );
}
