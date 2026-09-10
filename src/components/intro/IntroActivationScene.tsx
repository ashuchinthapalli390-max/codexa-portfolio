/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { motion } from "framer-motion";

interface IntroActivationSceneProps {
  isReducedMotion?: boolean;
}

export function IntroActivationScene({ isReducedMotion = false }: IntroActivationSceneProps) {
  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-lg mx-auto h-72">
      {/* 1 & 2. Central Energy Dot & Expanding Circular Ring */}
      <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56">
        {/* Expanding Thin Circular Ring */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: 1, opacity: [0, 0.9, 0.7] }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 rounded-full border border-[rgba(255,30,60,0.45)]"
          style={{
            boxShadow: "0 0 25px rgba(217,4,41,0.25), inset 0 0 15px rgba(217,4,41,0.15)",
          }}
        />

        {/* Outer Pulsing Glow */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.15, opacity: [0, 0.4, 0.25] }}
          transition={{ duration: 3.0, ease: "easeOut" }}
          className="absolute -inset-4 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,30,60,0.2) 0%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />

        {/* 3. Orbiting Particles */}
        {!isReducedMotion && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full pointer-events-none"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF1E3C] shadow-[0_0_10px_#FF1E3C]" />
            <div className="absolute bottom-4 right-6 w-1.5 h-1.5 rounded-full bg-[#D90429] shadow-[0_0_8px_#D90429]" />
            <div className="absolute top-10 left-4 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#FFF]" />
          </motion.div>
        )}

        {/* 4. Thin Connecting Red Laser Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <motion.line
            x1="0%"
            y1="50%"
            x2="50%"
            y2="50%"
            stroke="#FF1E3C"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          <motion.line
            x1="100%"
            y1="50%"
            x2="50%"
            y2="50%"
            stroke="#FF1E3C"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          <motion.line
            x1="50%"
            y1="0%"
            x2="50%"
            y2="50%"
            stroke="#FF1E3C"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
          />
          <motion.line
            x1="50%"
            y1="100%"
            x2="50%"
            y2="50%"
            stroke="#FF1E3C"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
          />
        </svg>

        {/* 5. CodeXa Logo Outline Forming Faintly */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.45, 0.35], scale: 0.95 }}
          transition={{ duration: 2.8, delay: 0.6, ease: "easeOut" }}
          className="relative w-20 h-20 rounded-full border border-[rgba(255,30,60,0.5)] bg-black/60 flex items-center justify-center overflow-hidden"
        >
          <img
            src="/assets/images/logo.jpeg"
            alt="CodeXa Emblem Outline"
            className="w-full h-full object-cover opacity-40 grayscale"
          />
        </motion.div>

        {/* Center Red Dot Energy Core */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.8, 1] }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute w-3 h-3 rounded-full bg-[#FF1E3C] shadow-[0_0_15px_#FF1E3C]"
        />
      </div>

      {/* 7. System Label: IDENTITY PROTOCOL // CODEXA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="mt-6 flex items-center gap-2.5 font-mono text-xs sm:text-sm tracking-[0.3em] text-[#FF1E3C] uppercase"
        style={{ textShadow: "0 0 12px rgba(255,30,60,0.6)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E3C] animate-pulse" />
        <span>IDENTITY PROTOCOL // CODEXA</span>
      </motion.div>
    </div>
  );
}
