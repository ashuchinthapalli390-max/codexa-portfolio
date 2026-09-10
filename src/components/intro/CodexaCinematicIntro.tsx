"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { INTRO_TIMING, IntroPhase } from "./intro-timing";
import { IntroOpeningScene } from "./IntroOpeningScene";
import { IntroActivationScene } from "./IntroActivationScene";
import { IntroWordmarkMorph } from "./IntroWordmarkMorph";
import { IntroLogoReveal } from "./IntroLogoReveal";
import { IntroLeaderReveal } from "./IntroLeaderReveal";
import { IntroFinalLockup } from "./IntroFinalLockup";
import { IntroSkipButton } from "./IntroSkipButton";
import { useIntroLeadership } from "./useIntroLeadership";

const SESSION_KEY = "codexa_intro_seen_v1";
const SESSION_KEY_ALT = "codexa_intro_seen_v2";

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
      sessionStorage.setItem(SESSION_KEY_ALT, "1");
    } catch {
      // Ignore private browsing storage restrictions
    }

    setIsFadingOut(true);
    // Signal homepage reveal immediately so hero animates smoothly behind overlay fade
    onComplete();

    // After fadeout transition finishes, completely unmount to free memory & CPU
    const finishTimer = setTimeout(() => {
      setPhase("done");
    }, 700);
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
      const seen1 = sessionStorage.getItem(SESSION_KEY);
      const seen2 = sessionStorage.getItem(SESSION_KEY_ALT);
      if ((seen1 === "1" || seen2 === "1") && !forceReplay) {
        // Skip animation immediately on subsequent page loads
        onComplete();
        setPhase("done");
        return;
      }
    } catch {
      // Continue normally if sessionStorage is unavailable
    }

    // 4. Fail-safe timeout (55 seconds max)
    const failsafe = setTimeout(() => {
      handleFinish();
    }, INTRO_TIMING.FAILSAFE_TIMEOUT_MS);
    timersRef.current.push(failsafe);

    // If reduced motion is requested by OS, play accelerated 2.0s version
    if (mq.matches) {
      const reducedTimer = setTimeout(() => {
        handleFinish();
      }, 2000);
      timersRef.current.push(reducedTimer);
      return () => clearAllTimers();
    }

    // 5. 50-Second Exact Timeline Sequence Orchestration
    // Scene 2: 05.0s — CodeXa System Activation
    const tActivation = setTimeout(
      () => setPhase("activation"),
      INTRO_TIMING.SCENE_2_ACTIVATION_START
    );

    // Scene 3: 09.0s — Multilingual CODEXA AGENCY transformation (12s duration)
    const tWordmark = setTimeout(
      () => setPhase("wordmark"),
      INTRO_TIMING.SCENE_3_WORDMARK_START
    );

    // Scene 4: 21.0s — Logo Formation and Glow (5s duration)
    const tLogo = setTimeout(
      () => setPhase("logo"),
      INTRO_TIMING.SCENE_4_LOGO_START
    );

    // Scene 5: 26.0s — Founder — Ashu (8s duration)
    const tFounder = setTimeout(
      () => setPhase("founder"),
      INTRO_TIMING.SCENE_5_FOUNDER_START
    );

    // Scene 6: 34.0s — Co-Founder — Sanjay (8s duration)
    const tCoFounder = setTimeout(
      () => setPhase("coFounder"),
      INTRO_TIMING.SCENE_6_COFOUNDER_START
    );

    // Scene 7: 42.0s — CEO — Kishore (6s duration)
    const tCeo = setTimeout(
      () => setPhase("ceo"),
      INTRO_TIMING.SCENE_7_CEO_START
    );

    // Scene 8: 48.0s — Final CodeXa Lockup (2s duration)
    const tFinal = setTimeout(
      () => setPhase("finalLockup"),
      INTRO_TIMING.SCENE_8_FINAL_LOCKUP_START
    );

    // At 50.0s — Homepage Reveal Transition
    const tReveal = setTimeout(
      () => handleFinish(),
      INTRO_TIMING.REVEAL_START
    );

    timersRef.current.push(
      tActivation,
      tWordmark,
      tLogo,
      tFounder,
      tCoFounder,
      tCeo,
      tFinal,
      tReveal
    );

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
        transition: "opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? "none" : "auto",
      }}
      aria-label="CodeXa 50-Second Cinematic Identity Sequence"
    >
      {/* 1. Skip Intro Button (Top-Right + ESC) */}
      <IntroSkipButton onSkip={handleFinish} />

      {/* 2. Opening Ambience Layer (Laser Line, Grid, HUD, Particles) */}
      <IntroOpeningScene isReducedMotion={isReducedMotion} />

      {/* 3. Central Stage with Framer Motion AnimatePresence Transitions */}
      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Scene 1: Opening System Initialization (0.0–5.0s) */}
          {phase === "opening" && (
            <motion.div
              key="scene-1-opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="h-28 flex items-center justify-center"
            />
          )}

          {/* Scene 2: CodeXa System Activation (5.0–9.0s) */}
          {phase === "activation" && (
            <motion.div
              key="scene-2-activation"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroActivationScene isReducedMotion={isReducedMotion} />
            </motion.div>
          )}

          {/* Scene 3: Multilingual Wordmark Morph (9.0–21.0s, 12s) */}
          {phase === "wordmark" && (
            <motion.div
              key="scene-3-wordmark"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroWordmarkMorph isReducedMotion={isReducedMotion} />
            </motion.div>
          )}

          {/* Scene 4: Official CodeXa Logo Reveal (21.0–26.0s, 5s) */}
          {phase === "logo" && (
            <motion.div
              key="scene-4-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLogoReveal />
            </motion.div>
          )}

          {/* Scene 5: Founder — Ashu (26.0–34.0s, 8s) */}
          {phase === "founder" && (
            <motion.div
              key="scene-5-founder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLeaderReveal
                role={leaders.founder.roleLabel}
                name={leaders.founder.name}
                isReducedMotion={isReducedMotion}
              />
            </motion.div>
          )}

          {/* Scene 6: Co-Founder — Sanjay (34.0–42.0s, 8s) */}
          {phase === "coFounder" && (
            <motion.div
              key="scene-6-cofounder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLeaderReveal
                role={leaders.coFounder.roleLabel}
                name={leaders.coFounder.name}
                isReducedMotion={isReducedMotion}
              />
            </motion.div>
          )}

          {/* Scene 7: CEO — Kishore (42.0–48.0s, 6s) */}
          {phase === "ceo" && (
            <motion.div
              key="scene-7-ceo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroLeaderReveal
                role={leaders.ceo.roleLabel}
                name={leaders.ceo.name}
                isReducedMotion={isReducedMotion}
              />
            </motion.div>
          )}

          {/* Scene 8: Final CodeXa Brand Lockup (48.0–50.0s, 2s) */}
          {phase === "finalLockup" && (
            <motion.div
              key="scene-8-final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center"
            >
              <IntroFinalLockup />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Bottom Cyber Coordinates Telemetry */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-between items-center px-8 text-[9px] font-mono text-[#FF1E3C]/40 tracking-widest pointer-events-none">
        <span>EST. 2024 // GLOBAL</span>
        <span className="hidden sm:inline-block">WHERE IDEAS BECOME DIGITAL REALITY</span>
        <span>SYS_CORE :: NOMINAL</span>
      </div>
    </div>
  );
}
