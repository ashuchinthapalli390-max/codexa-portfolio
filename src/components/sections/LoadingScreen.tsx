/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useRef } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

const SESSION_KEY = "codexa_intro_seen";

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  // Phase: "entry" | "playing" | "done"
  const [phase, setPhase] = useState<"entry" | "playing" | "done">("entry");
  const [logoError, setLogoError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Check reduced motion preference ─────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
  }, []);

  // ── Check sessionStorage — if already seen, skip immediately ────────
  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (seen === "1") {
        // Already watched this session — go directly to homepage
        onComplete();
      }
    } catch {
      // sessionStorage not available (private mode edge case) — show normally
    }
  }, [onComplete]);

  // ── Mark intro as seen and fade out ─────────────────────────────────
  const finishIntro = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
    setFadeOut(true);
    setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 600);
  };

  // ── Handle Enter Experience click ───────────────────────────────────
  const handleEnterClick = () => {
    if (isReducedMotion || videoError) {
      // Skip video for reduced motion or error — just fade to site
      finishIntro();
      return;
    }
    setPhase("playing");
  };

  // ── When phase becomes "playing", start video + 8s timer ───────────
  useEffect(() => {
    if (phase !== "playing") return;

    const video = videoRef.current;
    if (!video) {
      finishIntro();
      return;
    }

    // Start 8-second hard stop timer
    timerRef.current = setTimeout(() => {
      finishIntro();
    }, 8000);

    // Play video
    video.play().catch(() => {
      // Autoplay failed — finish immediately
      finishIntro();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Video ended before 8 seconds ───────────────────────────────────
  const handleVideoEnded = () => {
    finishIntro();
  };

  // ── Video error ─────────────────────────────────────────────────────
  const handleVideoError = () => {
    setVideoError(true);
    if (phase === "playing") {
      finishIntro();
    }
  };

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] select-none overflow-hidden"
      style={{
        transition: "opacity 0.6s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      {/* ── ENTRY SCREEN — shown before user clicks ───────────── */}
      {phase === "entry" && (
        <div className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center">
          {/* Corner brackets */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#D90429] opacity-60" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#D90429] opacity-60" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#D90429] opacity-60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#D90429] opacity-60" />
          </div>

          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(217,4,41,0.08) 0%, transparent 70%)",
            }}
          />

          {/* Status bar */}
          <div className="absolute top-6 left-0 right-0 flex justify-between items-center px-8 text-[10px] font-mono text-[#D90429]/60 tracking-widest">
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full bg-[#D90429]"
                style={{ animation: "pulse 2s ease-in-out infinite" }}
              />
              SECURE CONNECTION :: ACTIVE
            </span>
            <span className="hidden sm:block font-orbitron">CODEXA v1.0.0</span>
          </div>

          {/* Center content */}
          <div className="flex flex-col items-center text-center px-8 max-w-sm">
            {/* Logo */}
            <div className="relative mb-8">
              <div
                className="absolute -inset-6 rounded-full pointer-events-none"
                style={{
                  background: "rgba(217,4,41,0.12)",
                  filter: "blur(20px)",
                  animation: "pulse 3s ease-in-out infinite",
                }}
              />
              <div
                className="relative w-24 h-24 rounded-full border border-[rgba(217,4,41,0.4)] bg-[#070707] overflow-hidden flex items-center justify-center"
                style={{ boxShadow: "0 0 30px rgba(217,4,41,0.2)" }}
              >
                {!logoError ? (
                  <img
                    src="/assets/images/logo.jpeg"
                    alt="CodeXa Agency"
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="font-orbitron text-2xl font-black text-[#D90429]">CX</span>
                )}
              </div>
            </div>

            <h1
              className="text-4xl font-black font-orbitron tracking-[0.2em] text-white mb-2"
              style={{ textShadow: "0 0 40px rgba(217,4,41,0.3)" }}
            >
              CODEXA
            </h1>
            <p className="text-[11px] tracking-[0.4em] font-orbitron uppercase text-[#D90429] mb-12">
              Where Ideas Become Digital Reality
            </p>

            {/* Enter Experience button */}
            <button
              id="enter-experience-btn"
              onClick={handleEnterClick}
              className="relative group overflow-hidden rounded-xl font-orbitron font-bold text-sm uppercase tracking-widest text-white px-10 py-4 transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(217,4,41,0.2), rgba(217,4,41,0.05))",
                border: "1px solid rgba(217,4,41,0.5)",
                boxShadow:
                  "0 0 20px rgba(217,4,41,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(217,4,41,0.35), rgba(255,107,53,0.2))",
                }}
              />
              <span className="relative flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full bg-[#D90429]"
                  style={{ animation: "pulse 1.5s ease-in-out infinite" }}
                />
                Enter Experience
                <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {videoError && (
              <p className="text-[10px] font-mono text-[#333] mt-4">
                Intro video unavailable — click to enter site.
              </p>
            )}
          </div>

          {/* Bottom status */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <span className="text-[9px] font-orbitron tracking-[0.3em] text-[#333] uppercase">
              Codexa Agency · Est. 2024
            </span>
          </div>
        </div>
      )}

      {/* ── PLAYING PHASE — full-screen video ─────────────────── */}
      {(phase === "playing" || phase === "entry") && (
        <video
          ref={videoRef}
          src="/assets/intro/intro.mp4"
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100dvh",
            objectFit: "cover",
            objectPosition: "center",
            zIndex: phase === "playing" ? 1 : -1,
            display: phase === "playing" ? "block" : "none",
            background: "#000",
          }}
          aria-hidden="true"
        />
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
