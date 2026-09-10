"use client";

import React, { useEffect } from "react";

interface IntroSkipButtonProps {
  onSkip: () => void;
}

export function IntroSkipButton({ onSkip }: IntroSkipButtonProps) {
  // Global Escape keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  return (
    <button
      id="codexa-intro-skip-btn"
      onClick={onSkip}
      type="button"
      aria-label="Skip Intro Animation (Press Escape)"
      className="fixed top-4 right-4 sm:top-6 sm:right-8 z-[10001] group flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded border border-[rgba(217,4,41,0.4)] bg-black/40 hover:bg-[rgba(217,4,41,0.15)] hover:border-[#FF1E3C] text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-[#A5A5A5] hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF1E3C] focus:ring-offset-2 focus:ring-offset-black backdrop-blur-md cursor-pointer"
      style={{
        boxShadow: "0 0 15px rgba(217,4,41,0.15)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E3C] animate-ping" />
      <span>SKIP INTRO</span>
      <span className="hidden sm:inline-block text-[9px] text-[#D90429]/70 font-mono px-1 py-0.5 rounded bg-white/5 border border-white/10">
        ESC
      </span>
    </button>
  );
}
