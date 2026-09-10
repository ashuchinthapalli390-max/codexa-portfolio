"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { INTRO_TIMING, IntroPhase } from "./intro-timing";
import { IntroOpeningScene } from "./IntroOpeningScene";
import { IntroWordmarkMorph } from "./IntroWordmarkMorph";
import { IntroLogoReveal } from "./IntroLogoReveal";
import { IntroLeaderReveal } from "./IntroLeaderReveal";
import { IntroFinalLockup } from "./IntroFinalLockup";
import { IntroSkipButton } from "./IntroSkipButton";
import { useIntroLeadership } from "./useIntroLeadership";

const SESSION_KEY = "codexa_intro_seen_v2";

interface CodexaCinematicIntroProps {
  onComplete: () => void;
}

export function CodexaCinematicIntro({ onComplete }: CodexaCinematicIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>("opening");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const { leaders } = useIntroLeadership();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear all pending timeline timers safely
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Finish intro sequence cleanly and release overlay
  const handleFinish = useCallback(() => {
    clearAllTimers();
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore private browsing storage restrictions
    }

    setIsFadingOut(true);
    // Signal homepage reveal immediately so hero animates smoothly behind overlay fade
    onComplete();

    // After fadeout transition finishes, completely unmount to free memory & CPU
    const finishTimer = setTimeout(() => {
      setPhase("done");
    }, 600);
    timersRef.current.push(finishTimer);
  }, [clearAllTimers, onComplete]);

  // Initial check for session storage, query params, and motion preferences
  useEffect(() => {
    setIsMounted(true);

    // 1. Reduced motion check
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);

    // 2. Query params check for force replay (?replayIntro=1 or ?intro=force)
    const urlParams = new URLSearchParams(window.location.search);
    const forceReplay =
      urlParams.get("replayIntro") === "1" || urlParams.get("intro") === "force";

    // 3. Check sessionStorage
    try {
      const alreadySeen = sessionStorage.getItem(SESSION_KEY);
      if (alreadySeen === "1" && !forceReplay) {
        // Skip animation immediately on subsequent page loads
        onComplete();
        setPhase("done");
        return;
      }
    } catch {
      // Continue normally if sessionStorage is unavailable
    }

    // 4. Fail-safe timeout (12 seconds)
    const failsafe = setTimeout(() => {
      handleFinish();
    }, INTRO_TIMING.FAILSAFE_TIMEOUT_MS);
    timersRef.current.push(failsafe);

    // If reduced motion is requested by OS, play accelerated 1.4s version
    if (mq.matches) {
      const reducedTimer = setTimeout(() => {
        handleFinish();
      }, 1400);
      timersRef.current.push(reducedTimer);
      return () => clearAllTimers();
    }

    // 5. Timeline Sequence Orchestration
    const tWordmark = setTimeout(() => setPhase("wordmark"), INTRO_TIMING.WORDMARK_START);
    const tLogo = setTimeout(() => setPhase("logo"), INTRO_TIMING.LOGO_START);
    const tFounder = setTimeout(() => setPhase("founder"), INTRO_TIMING.FOUNDER_START);
    const tCoFounder = setTimeout(() => setPhase("coFounder"), INTRO_TIMING.COFOUNDER_START);
    const tCeo = setTimeout(() => setPhase("ceo"), INTRO_TIMING.CEO_START);
    const tFinal = setTimeout(() => setPhase("finalLockup"), INTRO_TIMING.FINAL_LOCKUP_START);
    const tReveal = setTimeout(() => handleFinish(), INTRO_TIMING.REVEAL_START);

    timersRef.current.push(tWordmark, tLogo, tFounder, tCoFounder, tCeo, tFinal, tReveal);

    return () => clearAllTimers();
  }, [clearAllTimers, handleFinish, onComplete]);

  if (!isMounted || phase === "done") {
    return null;
  }

  return (
    <div
      id="codexa-cinematic-intro-overlay"
      className="fixed inset-0 z-[99999] select-none overflow-hidden bg-[#050505] flex items-center justify-center pointer-events-auto"
      style={{
        transition: "opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? "none" : "auto",
      }}
      aria-label="CodeXa Cinematic Identity Sequence"
    >
      {/* 1. Skip Intro Button */}
      <IntroSkipButton onSkip={handleFinish} />

      {/* 2. Opening Ambience Layer (Laser Line, Grid, HUD, Particles) */}
      <IntroOpeningScene isReducedMotion={isReducedMotion} />

      {/* 3. Central Stage with Framer Motion AnimatePresence Transitions */}
      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Phase: Opening System Initialization */}
          {phase === "opening" && (
            <motion.div
              key="opening-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-24 flex items-center justify-center"
            />
          )}

          {/* Phase: Multilingual Wordmark Morph */}
          {phase === "wordmark" && (
            <motion.div
              key="wordmark-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroWordmarkMorph isReducedMotion={isReducedMotion} />
            </motion.div>
          )}

          {/* Phase: Official CodeXa Logo Reveal */}
          {phase === "logo" && (
            <motion.div
              key="logo-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLogoReveal />
              <p className="mt-4 font-orbitron font-bold text-xs sm:text-sm tracking-[0.3em] text-white uppercase text-center">
                CODEXA AGENCY
              </p>
            </motion.div>
          )}

          {/* Phase: Founder — Ashu */}
          {phase === "founder" && (
            <motion.div
              key="founder-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLeaderReveal
                role={leaders.founder.roleLabel}
                name={leaders.founder.name}
                isReducedMotion={isReducedMotion}
              />
            </motion.div>
          )}

          {/* Phase: Co-Founder — Sanjay */}
          {phase === "coFounder" && (
            <motion.div
              key="cofounder-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLeaderReveal
                role={leaders.coFounder.roleLabel}
                name={leaders.coFounder.name}
                isReducedMotion={isReducedMotion}
              />
            </motion.div>
          )}

          {/* Phase: CEO — Kishore */}
          {phase === "ceo" && (
            <motion.div
              key="ceo-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLeaderReveal
                role={leaders.ceo.roleLabel}
                name={leaders.ceo.name}
                isReducedMotion={isReducedMotion}
              />
            </motion.div>
          )}

          {/* Phase: Final CodeXa Brand Lockup */}
          {phase === "finalLockup" && (
            <motion.div
              key="final-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroFinalLockup />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Bottom Cyber Coordinates */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-between items-center px-8 text-[9px] font-mono text-[#FF1E3C]/40 tracking-widest pointer-events-none">
        <span>EST. 2024 // GLOBAL</span>
        <span className="hidden sm:inline-block">WHERE IDEAS BECOME DIGITAL REALITY</span>
        <span>SYS_CORE :: NOMINAL</span>
      </div>
    </div>
  );
}
