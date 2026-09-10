"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WORDMARK_CHAR_GLYPHS, CODEXA_MULTILINGUAL_VARIANTS } from "./intro-language-tokens";

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
  const [stepIndex, setStepIndex] = useState(0);

  // Stagger delay: 90ms to 140ms per slot (110ms)
  const startDelayMs = slotIndex * 110;

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
      // Step through language glyphs (220ms per language hold)
      intervalId = setInterval(() => {
        frameIndex++;
        setStepIndex(frameIndex);

        if (frameIndex < glyphPool.length - 1) {
          setCurrentGlyph(glyphPool[frameIndex]);
        } else {
          // Lock into target English character
          setCurrentGlyph(targetChar);
          setIsLocked(true);
          clearInterval(intervalId);
        }
      }, 220);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(intervalId);
    };
  }, [isSpace, isReducedMotion, targetChar, glyphPool, startDelayMs]);

  // If this is a space, return a dedicated fixed spacer slot
  if (isSpace) {
    return <div className="w-2 sm:w-4 md:w-6 lg:w-8 h-full pointer-events-none" />;
  }

  // Subtle rotation range: -3deg to +3deg
  const initialRot = slotIndex % 3 === 0 ? -2.5 : slotIndex % 2 === 0 ? 2.5 : -1.5;

  // Scale: 1.95 -> 1.35 -> 1.0
  const currentScale = isLocked ? 1.0 : stepIndex > 3 ? 1.35 : 1.95;

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden w-[24px] sm:w-[38px] md:w-[50px] lg:w-[62px] h-[46px] sm:h-[62px] md:h-[78px] lg:h-[92px] select-none"
      style={{
        perspective: "800px",
      }}
    >
      <motion.span
        initial={{
          opacity: 0,
          scale: isReducedMotion ? 1 : 1.95,
          rotate: isReducedMotion ? 0 : initialRot,
        }}
        animate={{
          opacity: isLocked ? 1 : 0.8,
          scale: isReducedMotion ? 1 : currentScale,
          rotate: isLocked ? 0 : initialRot * 0.4,
        }}
        transition={{
          duration: isReducedMotion ? 0.4 : 0.65,
          ease: [0.16, 1, 0.3, 1], // easeOutExpo
        }}
        className={`font-orbitron font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-center leading-none transition-colors duration-300 ${
          isLocked
            ? "text-white drop-shadow-[0_0_25px_rgba(255,30,60,0.85)]"
            : "text-[#FF1E3C] drop-shadow-[0_0_14px_rgba(217,4,41,0.6)]"
        }`}
        style={{
          fontFamily:
            "'Orbitron', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textShadow: isLocked
            ? "0 0 20px rgba(255,30,60,0.8), 0 0 40px rgba(217,4,41,0.45)"
            : "0 0 12px rgba(255,30,60,0.9)",
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
  const [activeLangIndex, setActiveLangIndex] = useState(0);

  useEffect(() => {
    // Cycle language indicators across Scene 3
    const langInterval = setInterval(() => {
      setActiveLangIndex((prev) => (prev + 1) % CODEXA_MULTILINGUAL_VARIANTS.length);
    }, 700);

    // 6.8s completion timer (Scene 3: 5.0s to 12.0s)
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 6800);

    return () => {
      clearInterval(langInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const currentVariant = CODEXA_MULTILINGUAL_VARIANTS[activeLangIndex];

  return (
    <div className="flex flex-col items-center justify-center">
      {/* 1. Character Slots Container */}
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

      {/* 2. Slow Localized Script Subtitle Telemetry */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="mt-4 flex items-center gap-2.5 text-[10px] sm:text-xs font-mono tracking-[0.35em] text-[#D90429] uppercase"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E3C] animate-pulse" />
        <span>MULTILINGUAL IDENTITY SYSTEM</span>
        <span className="text-[#666]">{"//"}</span>
        <span className="text-white/80 font-bold">{currentVariant?.nativeName}</span>
      </motion.div>
    </div>
  );
}
