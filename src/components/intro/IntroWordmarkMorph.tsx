"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WORDMARK_CHAR_GLYPHS } from "./intro-language-tokens";

interface IntroWordmarkMorphProps {
  isReducedMotion?: boolean;
  onComplete?: () => void;
}

const TARGET_CHARS = ["C", "O", "D", "E", "X", "A", " ", "A", "G", "E", "N", "C", "Y"];

interface SlotProps {
  targetChar: string;
  slotIndex: number;
  isReducedMotion: boolean;
}

function MorphCharacterSlot({ targetChar, slotIndex, isReducedMotion }: SlotProps) {
  const isSpace = targetChar === " ";
  const glyphPool = React.useMemo(() => {
    return WORDMARK_CHAR_GLYPHS[slotIndex] || [targetChar];
  }, [slotIndex, targetChar]);

  const [currentGlyph, setCurrentGlyph] = useState<string>(glyphPool[0] || targetChar);
  const [isLocked, setIsLocked] = useState(false);

  // Staggered delay: 70ms - 110ms per character (averaging ~85ms)
  const startDelayMs = slotIndex * 85;

  useEffect(() => {
    if (isSpace) return;
    if (isReducedMotion) {
      setCurrentGlyph(targetChar);
      setIsLocked(true);
      return;
    }

    let frameIndex = 0;
    let intervalId: ReturnType<typeof setInterval>;

    const startTimeout = setTimeout(() => {
      // Step rapidly through language glyphs
      intervalId = setInterval(() => {
        frameIndex++;
        if (frameIndex < glyphPool.length - 1) {
          setCurrentGlyph(glyphPool[frameIndex]);
        } else {
          // Lock into target English character
          setCurrentGlyph(targetChar);
          setIsLocked(true);
          clearInterval(intervalId);
        }
      }, 75);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(intervalId);
    };
  }, [isSpace, isReducedMotion, targetChar, glyphPool, startDelayMs]);

  // If this is a space, return a dedicated spacer slot
  if (isSpace) {
    return <div className="w-2 sm:w-4 md:w-6 lg:w-8 h-full pointer-events-none" />;
  }

  // Subtle rotation range: -4deg to +4deg
  const initialRot = (slotIndex % 3 === 0 ? -3 : slotIndex % 2 === 0 ? 3 : -1.5);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden w-[22px] sm:w-[34px] md:w-[46px] lg:w-[56px] h-[40px] sm:h-[56px] md:h-[72px] lg:h-[84px] select-none"
      style={{
        perspective: "600px",
      }}
    >
      <motion.span
        initial={{
          opacity: 0,
          scale: isReducedMotion ? 1 : 1.8,
          rotate: isReducedMotion ? 0 : initialRot,
        }}
        animate={{
          opacity: isLocked ? 1 : 0.75,
          scale: isLocked ? 1 : 1.25,
          rotate: isLocked ? 0 : initialRot * 0.5,
        }}
        transition={{
          duration: isReducedMotion ? 0.3 : 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`font-orbitron font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-center leading-none transition-colors duration-200 ${
          isLocked
            ? "text-white drop-shadow-[0_0_20px_rgba(255,30,60,0.85)]"
            : "text-[#FF1E3C] drop-shadow-[0_0_12px_rgba(217,4,41,0.6)]"
        }`}
        style={{
          fontFamily: "'Orbitron', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textShadow: isLocked
            ? "0 0 15px rgba(255,30,60,0.7), 0 0 30px rgba(217,4,41,0.4)"
            : "0 0 10px rgba(255,30,60,0.9)",
        }}
      >
        {currentGlyph}
      </motion.span>
    </div>
  );
}

export function IntroWordmarkMorph({
  isReducedMotion = false,
  onComplete,
}: IntroWordmarkMorphProps) {
  useEffect(() => {
    // Wordmark settles around 2200ms
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Character Slots Container */}
      <div className="flex items-center justify-center flex-nowrap max-w-full px-2">
        {TARGET_CHARS.map((char, idx) => (
          <MorphCharacterSlot
            key={idx}
            targetChar={char}
            slotIndex={idx}
            isReducedMotion={isReducedMotion}
          />
        ))}
      </div>

      {/* Cyber Subtitle Decoded Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="mt-3 flex items-center gap-2 text-[9px] sm:text-[11px] font-mono tracking-[0.35em] text-[#D90429] uppercase"
      >
        <span className="w-1 h-1 rounded-full bg-[#FF1E3C]" />
        <span>CYBER ARCHITECTURE AGENCY</span>
        <span className="w-1 h-1 rounded-full bg-[#FF1E3C]" />
      </motion.div>
    </div>
  );
}
