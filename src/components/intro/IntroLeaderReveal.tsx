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

  const startDelayMs = index * 65;

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
      interval = setInterval(() => {
        frame++;
        if (frame < glyphs.length - 1) {
          setCurrentGlyph(glyphs[frame]);
        } else {
          setCurrentGlyph(char);
          setIsLocked(true);
          clearInterval(interval);
        }
      }, 70);
    }, startDelayMs);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isSpace, char, glyphs, isReducedMotion, startDelayMs]);

  if (isSpace) {
    return <div className="w-2 sm:w-4" />;
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden w-[24px] sm:w-[38px] md:w-[50px] h-[44px] sm:h-[60px] md:h-[76px]">
      <motion.span
        initial={{
          opacity: 0,
          scale: isReducedMotion ? 1 : 1.7,
        }}
        animate={{
          opacity: isLocked ? 1 : 0.7,
          scale: isLocked ? 1 : 1.2,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`font-orbitron font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-center leading-none transition-colors duration-200 ${
          isLocked
            ? "text-white drop-shadow-[0_0_20px_rgba(255,30,60,0.8)]"
            : "text-[#FF1E3C] drop-shadow-[0_0_12px_rgba(217,4,41,0.6)]"
        }`}
        style={{
          fontFamily: "'Orbitron', 'Inter', sans-serif",
          textShadow: isLocked
            ? "0 0 15px rgba(255,30,60,0.8), 0 0 30px rgba(217,4,41,0.4)"
            : "0 0 10px rgba(255,30,60,0.9)",
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={
        isExiting
          ? { opacity: 0, scale: 1.04, filter: "blur(4px)" }
          : { opacity: 1, scale: 1, filter: "blur(0px)" }
      }
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center select-none max-w-xl mx-auto px-4"
    >
      {/* Subtle Crimson Laser Indicator Sweep */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4 }}
        className="w-16 h-[2px] bg-[#FF1E3C] mb-4 shadow-[0_0_10px_#FF1E3C]"
      />

      {/* Role Monospace Title */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-xs sm:text-sm md:text-base font-orbitron font-bold tracking-[0.4em] text-[#FF1E3C] uppercase mb-2"
        style={{ textShadow: "0 0 10px rgba(255,30,60,0.6)" }}
      >
        {role}
      </motion.div>

      {/* Name with Multilingual Character Morph */}
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
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[200px] sm:max-w-[280px] h-[1px] mt-3"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #FF1E3C 50%, transparent 100%)",
          boxShadow: "0 0 12px rgba(255,30,60,0.8)",
        }}
      />
    </motion.div>
  );
}
