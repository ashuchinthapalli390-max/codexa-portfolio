"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getMorphGlyphsForChar } from "./intro-language-tokens";

interface IntroLeaderRevealProps {
  role: string;
  name: string;
  isReducedMotion?: boolean;
  isExiting?: boolean;
}

interface LeaderCharSlotProps {
  char: string;
  index: number;
  isReducedMotion: boolean;
}

function LeaderCharSlot({ char, index, isReducedMotion }: LeaderCharSlotProps) {
  const isSpace = char === " ";
  const glyphs = React.useMemo(() => {
    return getMorphGlyphsForChar(char, index);
  }, [char, index]);

  const [currentGlyph, setCurrentGlyph] = useState<string>(glyphs[0] || char);
  const [isLocked, setIsLocked] = useState(false);

  // Stagger: 120ms to 160ms per character
  const startDelayMs = index * 140;

  useEffect(() => {
    if (isSpace) return;
    if (isReducedMotion) {
      setCurrentGlyph(char);
      setIsLocked(true);
      return;
    }

    let frame = 0;
    let interval: ReturnType<typeof setInterval>;

    const timer = setTimeout(() => {
      // Step deliberately through glyphs (240ms per step)
      interval = setInterval(() => {
        frame++;
        if (frame < glyphs.length - 1) {
          setCurrentGlyph(glyphs[frame]);
        } else {
          setCurrentGlyph(char);
          setIsLocked(true);
          clearInterval(interval);
        }
      }, 240);
    }, startDelayMs);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isSpace, char, glyphs, isReducedMotion, startDelayMs]);

  if (isSpace) {
    return <div className="w-3 sm:w-5" />;
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden w-[26px] sm:w-[42px] md:w-[56px] h-[48px] sm:h-[66px] md:h-[84px]">
      <motion.span
        initial={{
          opacity: 0,
          scale: isReducedMotion ? 1 : 2.0,
        }}
        animate={{
          opacity: isLocked ? 1 : 0.75,
          scale: isLocked ? 1 : 1.3,
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`font-orbitron font-black text-3xl sm:text-5xl md:text-6xl text-center leading-none transition-colors duration-300 ${
          isLocked
            ? "text-white drop-shadow-[0_0_22px_rgba(255,30,60,0.85)]"
            : "text-[#FF1E3C] drop-shadow-[0_0_14px_rgba(217,4,41,0.6)]"
        }`}
        style={{
          fontFamily: "'Orbitron', 'Inter', sans-serif",
          textShadow: isLocked
            ? "0 0 18px rgba(255,30,60,0.85), 0 0 35px rgba(217,4,41,0.45)"
            : "0 0 12px rgba(255,30,60,0.9)",
        }}
      >
        {currentGlyph}
      </motion.span>
    </div>
  );
}

export function IntroLeaderReveal({
  role,
  name,
  isReducedMotion = false,
  isExiting = false,
}: IntroLeaderRevealProps) {
  const characters = name.toUpperCase().split("");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.04, filter: "blur(5px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center select-none max-w-xl mx-auto px-4"
    >
      {/* Subtle Crimson Laser Indicator Sweep */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8 }}
        className="w-20 h-[2px] bg-[#FF1E3C] mb-4 shadow-[0_0_12px_#FF1E3C]"
      />

      {/* Role Monospace Title */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-xs sm:text-sm md:text-base font-orbitron font-bold tracking-[0.45em] text-[#FF1E3C] uppercase mb-2"
        style={{ textShadow: "0 0 12px rgba(255,30,60,0.65)" }}
      >
        {role}
      </motion.div>

      {/* Name with Slow Multilingual Character Morph */}
      <div className="flex items-center justify-center flex-nowrap py-1">
        {characters.map((char, idx) => (
          <LeaderCharSlot
            key={idx}
            char={char}
            index={idx}
            isReducedMotion={isReducedMotion}
          />
        ))}
      </div>

      {/* Thin Crimson Underline */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 1.0, ease: "easeOut" }}
        className="w-full max-w-[220px] sm:max-w-[320px] h-[1px] mt-4"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #FF1E3C 50%, transparent 100%)",
          boxShadow: "0 0 15px rgba(255,30,60,0.85)",
        }}
      />
    </motion.div>
  );
}
